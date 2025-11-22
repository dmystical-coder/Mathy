import { useState, useEffect } from 'react'
import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi'
import { CONTRACT_ABI, CONTRACT_ADDRESSES } from './constants'
import { Building2, School, Stethoscope, Trees, Trophy, Loader2, AlertCircle, UserRound, ArrowRight, Crown, UserPlus, Scale, Share2, Copy, Check } from 'lucide-react'
import { base, celo } from '@reown/appkit/networks'
import { useAppKit } from '@reown/appkit/react'
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
  const { close } = useAppKit()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [hasVoted, setHasVoted] = useState(false)
  const [delegateAddress, setDelegateAddress] = useState('')
  const [voterAddress, setVoterAddress] = useState('')
  const [isDelegating, setIsDelegating] = useState(false)
  const [isGrantingRight, setIsGrantingRight] = useState(false)
  const [isCopied, setIsCopied] = useState(false)

  const [hasRightToVote, setHasRightToVote] = useState(false)
  const [delegateStatus, setDelegateStatus] = useState<`0x${string}` | null>(null)
  const [voteStatus, setVoteStatus] = useState<number | null>(null)
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

  useEffect(() => {
    // Reset state on network switch
    setHasVoted(false)
    setProposals([])
    setVotingWeight(0n)
    setHasRightToVote(false)
    setDelegateStatus(null)
    setVoteStatus(null)
    
    // Close the AppKit modal if it's open
    close()
    
    // Wagmi hooks will naturally refetch when chainId/address changes
  }, [chainId, address])

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
        const delegate = voterData[2]
        const vote = voterData[3]

        setHasRightToVote(weight > 0n)
        setVotingWeight(weight)
        setHasVoted(voted)
        
        if (delegate !== '0x0000000000000000000000000000000000000000') {
            setDelegateStatus(delegate)
        } else {
            setDelegateStatus(null)
        }

        if (voted && delegate === '0x0000000000000000000000000000000000000000') {
            setVoteStatus(Number(vote))
        } else {
            setVoteStatus(null)
        }
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

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    }
  }

  const getIcon = (name: string) => ICONS[name] || FALLBACK_ICON

  return (
    <div className="min-h-screen bg-neu-base text-text flex flex-col items-center p-4 select-none font-sans">
      {/* Header */}
      <div className="w-full flex justify-between items-center p-4 max-w-6xl">
         <div className="flex items-center gap-2 p-3 rounded-xl shadow-neu-out-sm">
            <span className="text-xl font-bold tracking-widest uppercase text-gray-400 px-2">BALLOT</span>
         </div>
        <appkit-button />
      </div>

      <div className="flex-1 w-full max-w-4xl flex flex-col items-center justify-start pt-10 gap-8 pb-20">
        
        {/* Hero / Instructions */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-200 drop-shadow-lg">
            Vote for the Best!
          </h1>
          <p className="text-xl text-gray-400">
            Tap the one you like the most.
          </p>
          
          {/* User Weight Badge */}
          {isConnected && hasRightToVote && (
            <div className="flex items-center justify-center mt-4">
                <div className="flex items-center gap-2 text-sm font-medium bg-neu-base px-4 py-2 rounded-full shadow-neu-in text-gray-300">
                    <Scale size={14} className="text-primary" />
                    <span>Weight: {votingWeight.toString()}</span>
                </div>
            </div>
          )}
        </div>

        {/* Winner Display */}
        {winnerName && (
            <div className="w-full p-6 bg-neu-base rounded-3xl flex flex-col md:flex-row items-center justify-center md:justify-between px-8 gap-4 shadow-neu-out border-l-4 border-yellow-500/50">
                <div className="flex items-center gap-3 text-yellow-500 uppercase tracking-widest font-bold text-sm">
                    <div className="p-3 bg-neu-base rounded-full shadow-neu-out text-yellow-500">
                      <Trophy size={20} />
                    </div>
                    <span>Current Leader</span>
                </div>
                <div className="text-3xl md:text-4xl font-black text-gray-200 tracking-tight drop-shadow-md">
                    {hexToString(trim(winnerName, { dir: 'right' }))}
                </div>
            </div>
        )}

        {/* Network Warning */}
        {isConnected && chainId !== base.id && chainId !== celo.id && (
           <div className="bg-neu-base border-l-4 border-red-500 text-red-400 px-6 py-4 rounded-xl flex items-center gap-3 shadow-neu-out w-full">
             <AlertCircle size={24} />
             <span className="font-medium">Please switch to Base or Celo network</span>
           </div>
        )}

        {/* Voting Right Warning */}
        {isConnected && !hasRightToVote && !hasVoted && (
           <div className="bg-neu-base border-l-4 border-yellow-500 text-yellow-500 px-6 py-4 rounded-xl flex items-center gap-3 shadow-neu-out w-full">
             <AlertCircle size={24} />
             <span className="font-medium">You do not have voting rights yet.</span>
           </div>
        )}

        {/* Status Messages */}
        {isConfirming && (
           <div className="bg-neu-base border-l-4 border-blue-500 text-blue-400 px-6 py-4 rounded-xl flex items-center gap-4 shadow-neu-out animate-pulse w-full">
             <Loader2 size={24} className="animate-spin" />
             <span className="text-xl font-medium">{isDelegating ? "Confirming delegation..." : isGrantingRight ? "Confirming authorization..." : "Confirming vote..."}</span>
           </div>
        )}
         {isTransactionLoading && (
           <div className="bg-neu-base border-l-4 border-purple-500 text-purple-400 px-6 py-4 rounded-xl flex items-center gap-4 shadow-neu-out animate-pulse w-full">
             <Loader2 size={24} className="animate-spin" />
             <span className="text-xl font-medium">{isDelegating ? "Delegating..." : isGrantingRight ? "Authorizing..." : "Voting..."}</span>
           </div>
        )}
        {hasVoted && !isTransactionLoading && !isConfirming && (
            <div className="w-full space-y-6">
              <div className="bg-neu-base border-l-4 border-green-500 text-green-400 px-6 py-4 rounded-xl flex items-center gap-4 shadow-neu-out w-full">
                <div className="p-2 rounded-full shadow-neu-in bg-neu-dark">
                  <Trophy size={24} className="text-yellow-500" />
                </div>
                <div className="flex flex-col">
                    <span className="text-xl font-bold">You have voted!</span>
                    {delegateStatus ? (
                        <span className="text-sm opacity-80 break-all">Delegated to: {delegateStatus}</span>
                    ) : voteStatus !== null && proposals[voteStatus] ? (
                        <span className="text-sm opacity-80">Voted for: {proposals[voteStatus].name}</span>
                    ) : null}
                </div>
              </div>

              {/* Campaign Section */}
              {!delegateStatus && (
                <div className="bg-neu-base rounded-3xl p-8 shadow-neu-out border border-gray-800/50">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                    <div className="space-y-2">
                       <div className="flex items-center gap-2 text-primary">
                          <Share2 size={24} />
                          <h3 className="text-xl font-bold uppercase tracking-widest">Boost Your Impact</h3>
                       </div>
                       <p className="text-gray-400 max-w-md">
                         Even after voting, you can increase your impact! Ask others to delegate their vote to you. 
                         Any new delegations will immediately add to your vote count.
                       </p>
                    </div>
                    
                    <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                       <div className="flex items-center gap-2 text-sm font-medium bg-neu-base px-4 py-2 rounded-full shadow-neu-in text-gray-300 mb-2">
                          <Scale size={14} className="text-primary" />
                          <span>Current Weight: {votingWeight.toString()}</span>
                       </div>
                       <button 
                         onClick={handleCopyAddress}
                         className="group flex items-center gap-3 bg-neu-base hover:text-primary px-6 py-3 rounded-xl shadow-neu-out active:shadow-neu-pressed transition-all w-full md:w-auto justify-center"
                       >
                         <span className="font-mono text-gray-400 group-hover:text-primary transition-colors">
                           {address?.slice(0, 6)}...{address?.slice(-4)}
                         </span>
                         {isCopied ? <Check size={18} className="text-green-500" /> : <Copy size={18} />}
                       </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
        )}
        {writeError && (
            <div className="bg-neu-base border-l-4 border-red-500 text-red-400 px-6 py-4 rounded-xl flex items-center gap-4 shadow-neu-out w-full">
              <AlertCircle size={24} className="shrink-0" />
              <span className="text-lg font-medium">{getUserFriendlyError(writeError)}</span>
            </div>
        )}


        {/* Proposals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {proposals.map((prop) => (
            <button
              key={prop.index}
              onClick={() => handleVote(prop.index)}
              disabled={!isConnected || isConfirming || isTransactionLoading || hasVoted || !hasRightToVote}
              className="group relative h-48 bg-neu-base rounded-3xl shadow-neu-out active:shadow-neu-pressed hover:-translate-y-1 transition-all duration-200 flex items-center px-8 gap-6 text-left disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-neu-out disabled:hover:translate-y-0 overflow-hidden"
            >
              {/* Icon Box */}
              <div className="w-20 h-20 rounded-2xl bg-neu-base shadow-neu-out flex items-center justify-center text-primary group-hover:text-blue-400 transition-colors">
                {getIcon(prop.name)}
              </div>

              {/* Content */}
              <div className="flex-1 z-10">
                <h2 className="text-2xl font-bold text-gray-200 mb-2">{prop.name}</h2>
                <div className="flex items-center gap-2 text-gray-400">
                  <span className="text-sm uppercase tracking-wider font-medium">Votes</span>
                  <span className="text-xl font-mono text-gray-300 bg-neu-base shadow-neu-in px-3 py-1 rounded-lg">{prop.voteCount.toString()}</span>
                </div>
              </div>
            </button>
          ))}

          {proposals.length === 0 && isConnected && (
             <div className="col-span-full text-center py-10 text-gray-500">
                Loading proposals...
             </div>
          )}
        </div>
        
        {!isConnected && (
          <div className="mt-10 p-8 bg-neu-base rounded-3xl shadow-neu-out text-blue-400 text-center max-w-sm mx-auto">
            <p className="text-lg font-medium">Connect your wallet to start voting!</p>
          </div>
        )}

        {/* Delegation Section */}
        {isConnected && !hasVoted && (
            <div className="w-full mt-8 pt-8 border-t border-gray-800/50">
                <div className="bg-neu-base rounded-3xl p-8 shadow-neu-out">
                    <div className="flex items-center gap-3 mb-6 text-gray-400">
                        <div className="p-2 bg-neu-base shadow-neu-out rounded-lg">
                            <UserRound size={24} />
                        </div>
                        <h3 className="text-xl font-bold uppercase tracking-widest">Delegate Vote</h3>
                    </div>
                    <p className="text-gray-500 mb-6 font-medium">Trust someone else to vote for you? Enter their address below.</p>
                    
                    <div className="flex flex-col md:flex-row gap-6">
                        <input 
                            type="text" 
                            placeholder="0x..." 
                            value={delegateAddress}
                            onChange={(e) => setDelegateAddress(e.target.value)}
                            className="flex-1 bg-neu-base shadow-neu-in rounded-xl px-6 py-4 text-gray-200 focus:outline-none focus:shadow-neu-pressed transition-all placeholder-gray-600"
                        />
                        <button 
                            onClick={handleDelegate}
                            disabled={!delegateAddress || isConfirming || isTransactionLoading}
                            className="bg-neu-base text-gray-300 shadow-neu-out hover:text-primary active:shadow-neu-pressed px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
            <div className="w-full mt-8 pt-8 border-t border-gray-800/50">
                <div className="bg-neu-base rounded-3xl p-8 shadow-neu-out border-l-4 border-purple-500/50">
                    <div className="flex items-center gap-3 mb-6 text-purple-400">
                        <div className="p-2 bg-neu-base shadow-neu-out rounded-lg text-purple-500">
                            <Crown size={24} />
                        </div>
                        <h3 className="text-xl font-bold uppercase tracking-widest">Chairperson Panel</h3>
                    </div>
                    <p className="text-gray-500 mb-6 font-medium">Authorize a new voter to participate in the ballot.</p>
                    
                    <div className="flex flex-col md:flex-row gap-6">
                        <input 
                            type="text" 
                            placeholder="Voter Address (0x...)" 
                            value={voterAddress}
                            onChange={(e) => setVoterAddress(e.target.value)}
                            className="flex-1 bg-neu-base shadow-neu-in rounded-xl px-6 py-4 text-gray-200 focus:outline-none focus:shadow-neu-pressed transition-all placeholder-gray-600"
                        />
                        <button 
                            onClick={handleGiveRightToVote}
                            disabled={!voterAddress || isConfirming || isTransactionLoading}
                            className="bg-neu-base text-purple-400 shadow-neu-out hover:text-purple-300 active:shadow-neu-pressed px-8 py-4 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
