import { BaseError, ContractFunctionRevertedError } from 'viem'

export function getUserFriendlyError(error: any): string {
  if (!error) return "An unknown error occurred."

  // 1. Check for Contract Reversion (e.g. require/revert in Solidity)
  if (error instanceof BaseError) {
    const revertError = error.walk(err => err instanceof ContractFunctionRevertedError)
    
    if (revertError instanceof ContractFunctionRevertedError) {
      // If the contract returned a reason string
      if (revertError.reason) {
        return `Contract Error: ${revertError.reason}`
      }
      // If the contract returned a custom error name
      if (revertError.data?.errorName) {
         // Handle common Ballot errors specifically if needed
         if (revertError.data.errorName === 'AlreadyVoted') {
             return "You have already voted!"
         }
         return `Error: ${revertError.data.errorName}`
      }
    }
  }

  // 2. Check for User Rejection
  if (error.message?.includes("User rejected") || error.name === 'UserRejectedRequestError') {
    return "You cancelled the request."
  }

  // 3. Check for Network/Connection Issues
  if (error.message?.includes("Network") || error.message?.includes("network")) {
    return "Network error. Please check your connection."
  }

  // 4. Generic/Unknown Fallback
  // Sometimes the detailed message is buried
  const message = error.shortMessage || error.message || "Something went wrong."
  
  // Truncate extremely long technical errors
  if (message.length > 100) {
      return "Transaction failed. Please check your wallet for details."
  }

  return message
}

