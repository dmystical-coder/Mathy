import { useState, useEffect } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { CONTRACT_ABI, CONTRACT_ADDRESSES } from './constants'
import { Building2, School, Stethoscope, Trees, Trophy, Loader2, AlertCircle, UserRound, ArrowRight, Crown, UserPlus, Scale } from 'lucide-react'
import { base, celo } from '@reown/appkit/networks'
import { hexToString, trim } from 'viem'
import { getUserFriendlyError } from './utils/errorHandling'

// Map known proposal names to icons
const ICONS: Record<string, React.ReactNode> = {
  'Build Bridge': <Building2 size={48} />,
  'Build School': <School size={48} />,
  'Build Hospital': <Stethoscope size={48} />,
  'Build Park': <Trees size={48} />,
}

const FALLBACK_ICON = <Building2 size={48} />

interface Proposal {
  name: string
  voteCount: bigint
  index: number
}

export default function App() {
  const { isConnected, chainId, address } = useAccount()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [hasVoted, setHasVoted] = useState(false)
  const [delegateAddress, setDelegateAddress] = useState('')
  const [voterAddress, setVoterAddress] = useState('')
  const [isDelegating, setIsDelegating] = useState(false)
  const [isGrantingRight, setIsGrantingRight] = useState(false)

  const [hasRightToVote, setHasRightToVote] = useState(false)
  const [votingWeight, setVotingWeight] = useState<bigint>(0n)

  const currentAddress = chainId ? CONTRACT_ADDRESSES[chainId] : undefined

  // Write Hook
  const { data: hash, isPending: isConfirming, writeContract, error: writeError } = useWriteContract()

  // Transaction Receipt Hook
  const { isLoading: isTransactionLoading, isSuccess: isTransactionSuccess } = useWaitForTransactionReceipt({
    hash,
  })

  // Check Chairperson
  const { data: chairpersonAddress } = useReadContract({
    address: currentAddress,
    abi: CONTRACT_ABI,
    functionName: 'chairperson',
    query: { enabled: !!currentAddress }
  })

  const isChairperson = chairpersonAddress && address && chairpersonAddress === address

  // Check Voter Status
  const { data: voterData, refetch: refetchVoter } = useReadContract({
    address: currentAddress,
    abi: CONTRACT_ABI,
    functionName: 'voters',
    args: [address || '0x0000000000000000000000000000000000000000'],
    query: { enabled: !!currentAddress && !!address }
  })

  // Read Proposals
  const { data: prop0, refetch: refetch0 } = useReadContract({
    address: currentAddress,
    abi: CONTRACT_ABI,
    functionName: 'proposals',
    args: [BigInt(0)],
    query: { enabled: !!currentAddress }
  })
  const { data: prop1, refetch: refetch1 } = useReadContract({
    address: currentAddress,
    abi: CONTRACT_ABI,
    functionName: 'proposals',
    args: [BigInt(1)],
    query: { enabled: !!currentAddress }
  })
  const { data: prop2, refetch: refetch2 } = useReadContract({
    address: currentAddress,
    abi: CONTRACT_ABI,
    functionName: 'proposals',
    args: [BigInt(2)],
    query: { enabled: !!currentAddress }
  })
  const { data: prop3, refetch: refetch3 } = useReadContract({
    address: currentAddress,
    abi: CONTRACT_ABI,
    functionName: 'proposals',
    args: [BigInt(3)],
    query: { enabled: !!currentAddress }
  })

  const { data: winnerName, refetch: refetchWinner } = useReadContract({
    address: currentAddress,
    abi: CONTRACT_ABI,
    functionName: 'winnerName',
    query: { enabled: !!currentAddress }
  })

  // Refresh data on load and after vote
  const refetchAll = () => {
    refetch0()
    refetch1()
    refetch2()
    refetch3()
    refetchWinner()
    refetchVoter()
  }

  useEffect(() => {
    if (isTransactionSuccess) {
        setHasVoted(true)
        refetchAll()
        setIsDelegating(false)
        setIsGrantingRight(false)
        setVoterAddress('')
    }
  }, [isTransactionSuccess])

  // Update voted status from contract
  useEffect(() => {
    if (voterData) {
        // voterData is [weight, voted, delegate, vote]
        const weight = voterData[0]
        const voted = voterData[1]
        setHasRightToVote(weight > 0n)
        setVotingWeight(weight)
        setHasVoted(voted)
    }
  }, [voterData])


  // Process raw data into friendly format
  useEffect(() => {
    const rawProps = [prop0, prop1, prop2, prop3]
    const processed: Proposal[] = []

    rawProps.forEach((p, index) => {
      if (p) {
        try {
          // p is [bytes32 name, uint voteCount]
          const name = hexToString(trim(p[0], { dir: 'right' }))
          const voteCount = p[1]
          processed.push({ name, voteCount, index })
        } catch (e) {
          console.error("Error parsing proposal", e)
        }
      }
    })
    setProposals(processed)
  }, [prop0, prop1, prop2, prop3])

  const handleVote = (index: number) => {
    if (!isConnected || !currentAddress || hasVoted || !hasRightToVote) return
    setIsDelegating(false)
    setIsGrantingRight(false)
    writeContract({
      address: currentAddress,
      abi: CONTRACT_ABI,
      functionName: 'vote',
      args: [BigInt(index)],
    })
  }

  const handleDelegate = () => {
    if (!isConnected || !currentAddress || !delegateAddress) return
    setIsDelegating(true)
    setIsGrantingRight(false)
    writeContract({
      address: currentAddress,
      abi: CONTRACT_ABI,
      functionName: 'delegate',
      args: [delegateAddress as `0x${string}`],
    })
  }

  const handleGiveRightToVote = () => {
    if (!isConnected || !currentAddress || !voterAddress || !isChairperson) return
    setIsDelegating(false)
    setIsGrantingRight(true)
    writeContract({
      address: currentAddress,
      abi: CONTRACT_ABI,
      functionName: 'giveRightToVote',
      args: [voterAddress as `0x${string}`],
    })
  }

  const getIcon = (name: string) => ICONS[name] || FALLBACK_ICON

  return (
    <div className="min-h-screen bg-background text-text flex flex-col items-center p-4 select-none font-sans">
      {/* Header */}
      <div className="w-full flex justify-between items-center p-4">
         <div className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-widest uppercase text-gray-500">BALLOT</span>
         </div>
        <appkit-button />
      </div>

      <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-start pt-10 gap-8 pb-20">
        
        {/* Hero / Instructions */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white">
            Vote for the Best!
          </h1>
          <p className="text-xl text-gray-400">
            Tap the one you like the most.
          </p>
          
          {/* User Weight Badge */}
          {isConnected && hasRightToVote && (
            <div className="flex items-center justify-center mt-2">
                <div className="flex items-center gap-2 text-sm font-medium bg-gray-800/50 px-3 py-1 rounded-full border border-gray-700 text-gray-300">
                    <Scale size={14} className="text-primary" />
                    <span>Weight: {votingWeight.toString()}</span>
                </div>
            </div>
          )}
        </div>

        {/* Winner Display */}
        {winnerName && (
            <div className="w-full p-6 bg-gradient-to-r from-yellow-900/20 via-orange-900/20 to-yellow-900/20 border border-yellow-800/50 rounded-3xl flex flex-col md:flex-row items-center justify-center md:justify-between px-8 gap-4 shadow-lg shadow-orange-900/10">
                <div className="flex items-center gap-3 text-yellow-500 uppercase tracking-widest font-bold text-sm">
                    <div className="p-2 bg-yellow-500/20 rounded-full">
                      <Trophy size={20} />
                    </div>
                    <span>Current Leader</span>
                </div>
                <div className="text-3xl md:text-4xl font-black text-white tracking-tight">
                    {hexToString(trim(winnerName, { dir: 'right' }))}
                </div>
            </div>
        )}

        {/* Network Warning */}
        {isConnected && chainId !== base.id && chainId !== celo.id && (
           <div className="bg-red-900/30 border border-red-800 text-red-200 px-4 py-2 rounded-xl flex items-center gap-2">
             <AlertCircle size={20} />
             <span>Please switch to Base or Celo</span>
           </div>
        )}

        {/* Voting Right Warning */}
        {isConnected && !hasRightToVote && !hasVoted && (
           <div className="bg-yellow-900/30 border border-yellow-800 text-yellow-200 px-4 py-2 rounded-xl flex items-center gap-2">
             <AlertCircle size={20} />
             <span>You do not have voting rights yet.</span>
           </div>
        )}

        {/* Status Messages */}
        {isConfirming && (
           <div className="bg-blue-900/30 border border-blue-800 text-blue-200 px-6 py-3 rounded-2xl flex items-center gap-3 animate-pulse">
             <Loader2 size={24} className="animate-spin" />
             <span className="text-xl">{isDelegating ? "Confirming delegation..." : isGrantingRight ? "Confirming authorization..." : "Confirming vote..."}</span>
           </div>
        )}
         {isTransactionLoading && (
           <div className="bg-purple-900/30 border border-purple-800 text-purple-200 px-6 py-3 rounded-2xl flex items-center gap-3 animate-pulse">
             <Loader2 size={24} className="animate-spin" />
             <span className="text-xl">{isDelegating ? "Delegating..." : isGrantingRight ? "Authorizing..." : "Voting..."}</span>
           </div>
        )}
        {hasVoted && !isTransactionLoading && !isConfirming && (
            <div className="bg-green-900/30 border border-green-800 text-green-200 px-6 py-3 rounded-2xl flex items-center gap-3">
              <Trophy size={24} className="text-yellow-500" />
              <span className="text-xl">You have voted!</span>
            </div>
        )}
        {writeError && (
            <div className="bg-red-900/30 border border-red-800 text-red-200 px-6 py-3 rounded-2xl flex items-center gap-3">
              <AlertCircle size={24} className="shrink-0" />
              <span className="text-lg font-medium">{getUserFriendlyError(writeError)}</span>
            </div>
        )}


        {/* Proposals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
          {proposals.map((prop) => (
            <button
              key={prop.index}
              onClick={() => handleVote(prop.index)}
              disabled={!isConnected || isConfirming || isTransactionLoading || hasVoted || !hasRightToVote}
              className="group relative h-40 md:h-48 bg-surface rounded-3xl border-2 border-gray-800 hover:border-primary hover:bg-gray-800 transition-all active:scale-95 flex items-center px-8 gap-6 text-left disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden disabled:hover:border-gray-800 disabled:hover:bg-surface"
            >
              {/* Icon Box */}
              <div className="w-20 h-20 rounded-2xl bg-gray-900 flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-inner">
                {getIcon(prop.name)}
              </div>

              {/* Content */}
              <div className="flex-1 z-10">
                <h2 className="text-2xl font-bold text-white mb-1">{prop.name}</h2>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-sm uppercase tracking-wider font-medium">Current Votes</span>
                  <span className="text-xl font-mono text-white bg-gray-900 px-2 rounded-lg">{prop.voteCount.toString()}</span>
                </div>
              </div>
              
              {/* Decoration */}
              <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/20 transition-colors" />
            </button>
          ))}

          {proposals.length === 0 && isConnected && (
             <div className="col-span-full text-center py-10 text-gray-500">
                Loading proposals...
             </div>
          )}
        </div>
        
        {!isConnected && (
          <div className="mt-10 p-6 bg-blue-900/20 rounded-2xl border border-blue-900/50 text-blue-200 text-center max-w-sm">
            <p className="text-lg">Connect your wallet to start voting!</p>
          </div>
        )}

        {/* Delegation Section */}
        {isConnected && !hasVoted && (
            <div className="w-full mt-8 pt-8 border-t border-gray-800">
                <div className="bg-gray-900/50 rounded-3xl p-8 border border-gray-800">
                    <div className="flex items-center gap-3 mb-6 text-gray-400">
                        <UserRound size={24} />
                        <h3 className="text-xl font-bold uppercase tracking-widest">Delegate Vote</h3>
                    </div>
                    <p className="text-gray-500 mb-6">Trust someone else to vote for you? Enter their address below.</p>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                        <input 
                            type="text" 
                            placeholder="0x..." 
                            value={delegateAddress}
                            onChange={(e) => setDelegateAddress(e.target.value)}
                            className="flex-1 bg-black/50 border border-gray-700 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                        />
                        <button 
                            onClick={handleDelegate}
                            disabled={!delegateAddress || isConfirming || isTransactionLoading}
                            className="bg-gray-700 hover:bg-gray-600 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            <span>Delegate</span>
                            <ArrowRight size={20} />
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Chairperson Controls */}
        {isConnected && isChairperson && (
            <div className="w-full mt-8 pt-8 border-t border-gray-800">
                <div className="bg-gray-900/50 rounded-3xl p-8 border border-gray-800 shadow-lg shadow-purple-900/10">
                    <div className="flex items-center gap-3 mb-6 text-purple-400">
                        <Crown size={24} />
                        <h3 className="text-xl font-bold uppercase tracking-widest">Chairperson Panel</h3>
                    </div>
                    <p className="text-gray-500 mb-6">Authorize a new voter to participate in the ballot.</p>
                    
                    <div className="flex flex-col md:flex-row gap-4">
                        <input 
                            type="text" 
                            placeholder="Voter Address (0x...)" 
                            value={voterAddress}
                            onChange={(e) => setVoterAddress(e.target.value)}
                            className="flex-1 bg-black/50 border border-gray-700 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all"
                        />
                        <button 
                            onClick={handleGiveRightToVote}
                            disabled={!voterAddress || isConfirming || isTransactionLoading}
                            className="bg-purple-900/50 hover:bg-purple-800/50 border border-purple-700 text-white px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                        >
                            <span>Authorize</span>
                            <UserPlus size={20} />
        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  )
}
