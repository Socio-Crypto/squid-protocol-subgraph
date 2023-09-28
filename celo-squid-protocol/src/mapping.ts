import { BigInt, log } from "@graphprotocol/graph-ts";
import {
  GasAdded,
  GasPaidForContractCall,
  GasPaidForContractCallWithToken,
  NativeGasAdded,
  NativeGasPaidForContractCall,
  NativeGasPaidForContractCallWithToken,
} from "../generated/AxelarGasService/AxelarGasService";
import { 
  AddressStat, 
  NoUsersByDestinationChain, 
  AddressStatByDate, 
  TokenStat, 
  TokenStatByDate, 
  TokenStatGroupByDate, 
  TokenStatByMonth ,
  SourceChain,
  UserAddresses,
  DestinationUsers,
  DestinationChain,
  TokenStatUsers,
  TokenStatByDateUsers,
} from "../generated/schema";

const SQUID_ROUTER_ADDRESS = "0xce16f69375520ab01377ce7b88f5ba8c48f8d666";

export function handleNativeGasPaidForContractCallWithToken(event: NativeGasPaidForContractCallWithToken): void {
  if(!event) {
    return;
  }

  // if it's not from squid
  if(event.params.sourceAddress.toHexString() != SQUID_ROUTER_ADDRESS) {
    return;
  }

  // Define date, month for using as part of IDs
  let date = new Date(event.block.timestamp.toI64() * 1000); // to milliseconds
  let y = date.getUTCFullYear().toString();
  let m = (date.getUTCMonth() + 1).toString();
  m = m.length < 2? '0' + m : m;
  let d = date.getUTCDate().toString();
  d = d.length < 2? '0' + d : d;

  let dateStr = y + '/' + m + '/' + d;
  let monthStr = y + '/' + m;
  // end define entity date, month

  // start AddressStat entity
  // have to separate cause the graph does not support aggregations
  let id = event.transaction.from.toHex() + "_" + event.params.destinationChain + "_" + event.params.symbol;
  let addressStat = AddressStat.load(id); // ID = user_address + symbol
  if(!addressStat) {
    addressStat = new AddressStat(id);
    addressStat.user_address = event.transaction.from.toHex();
    addressStat.sourceChain = "celo";
    addressStat.destinationChain = event.params.destinationChain;
    addressStat.volume = new BigInt(0);
    addressStat.symbol = event.params.symbol;
  }
  addressStat.noSwaps += 1;
  addressStat.volume = addressStat.volume.plus(event.params.amount);
  addressStat.save();
  
  let ChainId = event.params.destinationChain + "_" + event.params.symbol;
  let noUsersByDestinationChain = NoUsersByDestinationChain.load(ChainId); 
  if(!noUsersByDestinationChain) {
    noUsersByDestinationChain = new NoUsersByDestinationChain(ChainId);
    noUsersByDestinationChain.destinationChain = event.params.destinationChain;
    noUsersByDestinationChain.noUsers = 1;
    noUsersByDestinationChain.symbol = event.params.symbol;
  }
  noUsersByDestinationChain.noUsers += 1;
  noUsersByDestinationChain.save();
  // end AddressStat entity 


  // start tokenStat entity
  let tokenStatId = event.params.destinationChain + "_" + event.params.symbol; // ID = destination chain + symbol
  let tokenStat = TokenStat.load(tokenStatId); // ID = symbol
  if(!tokenStat) {
    tokenStat = new TokenStat(tokenStatId);
    tokenStat.sourceChain = "celo";
    tokenStat.destinationChain = event.params.destinationChain;
    tokenStat.volume = new BigInt(0);
    tokenStat.symbol = event.params.symbol;
  }

  tokenStat.noSwaps += 1;
  tokenStat.volume = tokenStat.volume.plus(event.params.amount);
  tokenStat.save();
  // end tokenStat entity
  

  // start addressStatByDate entity
  let addressDateId = dateStr + "_" + event.transaction.from.toHex() + "_" + event.params.destinationChain + "_" + event.params.symbol;
  let addressStatByDate = AddressStatByDate.load(addressDateId);
  if(!addressStatByDate) {
    addressStatByDate = new AddressStatByDate(addressDateId);
    addressStatByDate.user_address = event.transaction.from.toHex();
    addressStatByDate.date = dateStr;
    addressStatByDate.sourceChain = "celo";
    addressStatByDate.destinationChain = event.params.destinationChain;
    addressStatByDate.symbol = event.params.symbol;
    addressStatByDate.volume = new BigInt(0);
  }

  addressStatByDate.noSwaps += 1;
  addressStatByDate.volume = addressStatByDate.volume.plus(event.params.amount);
  addressStatByDate.save();
  // end addressStatByDate entity


  // start tokenStatsByDate entity
  let dateId = dateStr + "_" + event.params.destinationChain + "_" + event.params.symbol;
  let tokenStatsByDate = TokenStatByDate.load(dateId);
  if(!tokenStatsByDate) {
    tokenStatsByDate = new TokenStatByDate(dateId);
    tokenStatsByDate.date = dateStr;
    tokenStatsByDate.sourceChain = "celo";
    tokenStatsByDate.destinationChain = event.params.destinationChain;
    tokenStatsByDate.symbol = event.params.symbol;
    tokenStatsByDate.volume = new BigInt(0);
    tokenStatsByDate.noSwappers = 1;
  }

  let tokenStatByDateUsersID = event.transaction.from.toHex()
  let tokenStatByDateUsers = TokenStatByDateUsers.load(tokenStatByDateUsersID);
  if (!tokenStatByDateUsers){
    tokenStatByDateUsers = new TokenStatByDateUsers(tokenStatByDateUsersID);
    tokenStatByDateUsers.token = tokenStatsByDate.id;
    tokenStatByDateUsers.save()
    tokenStatsByDate.noSwappers += 1
  }

  tokenStatsByDate.noSwaps += 1;
  tokenStatsByDate.volume = tokenStatsByDate.volume.plus(event.params.amount);
  tokenStatsByDate.save();
  // end tokenStatsByDate entity


  // start tokenStatGroupByDate entity
  let groupByDateId = dateStr  + "_" + event.params.symbol;
  let tokenStatGroupByDate = TokenStatGroupByDate.load(groupByDateId);
  if(!tokenStatGroupByDate) {
    tokenStatGroupByDate = new TokenStatGroupByDate(groupByDateId);
    tokenStatGroupByDate.date = dateStr;
    tokenStatGroupByDate.symbol = event.params.symbol;
    tokenStatGroupByDate.volume = new BigInt(0);
    tokenStatGroupByDate.avg_volume = new BigInt(0);
    tokenStatGroupByDate.noSwappers = 0;
    tokenStatGroupByDate.noSwaps = 0;
  }

  let tokenStatUsersID = event.transaction.from.toHex()
  let tokenStatUsers = TokenStatUsers.load(tokenStatUsersID);
  if (!tokenStatUsers){
    tokenStatUsers = new TokenStatUsers(tokenStatUsersID);
    tokenStatUsers.tokenstatgroupbydate = tokenStatGroupByDate.id;
    tokenStatUsers.save()
    tokenStatGroupByDate.noSwappers += 1
  }
  tokenStatGroupByDate.noSwaps += 1
  
  tokenStatGroupByDate.volume = tokenStatGroupByDate.volume.plus(event.params.amount);
  if (tokenStatGroupByDate.volume != new BigInt(0)){
    tokenStatGroupByDate.avg_volume = tokenStatGroupByDate.volume.div(BigInt.fromI32(tokenStatGroupByDate.noSwaps))
  }

  tokenStatGroupByDate.save();
// end tokenStatGroupByDate entity


// start tokenStatsByMonth entity 
  let monthId = monthStr + "_" + event.params.destinationChain + "_" + event.params.symbol;
  let tokenStatsByMonth = TokenStatByMonth.load(monthId);
  if(!tokenStatsByMonth) {
    tokenStatsByMonth = new TokenStatByMonth(monthId);
    tokenStatsByMonth.date = monthStr;
    tokenStatsByMonth.sourceChain = "celo";
    tokenStatsByMonth.destinationChain = event.params.destinationChain;
    tokenStatsByMonth.symbol = event.params.symbol;
    tokenStatsByMonth.volume = new BigInt(0);
    tokenStatsByMonth.user_addresses = [event.transaction.from.toHex()]; // Initialize with the first user
    tokenStatsByMonth.noSwappers = 1;
  }else{
    if (!tokenStatsByMonth.user_addresses.includes(event.transaction.from.toHex())) {
      tokenStatsByMonth.user_addresses.push(event.transaction.from.toHex());
      tokenStatsByMonth.noSwappers += 1;
    }
  }
  tokenStatsByMonth.noSwaps += 1;
  tokenStatsByMonth.volume = tokenStatsByMonth.volume.plus(event.params.amount);
  tokenStatsByMonth.save();
  // end tokenStatsByMonth entity


  // start SourceChain entity
  let sourceChainId = 'celo' + "_" + event.params.symbol
  let sourceChain = SourceChain.load(sourceChainId);
  if(!sourceChain) {
    sourceChain = new SourceChain(sourceChainId);
    sourceChain.volume = new BigInt(0);
    sourceChain.symbol = event.params.symbol;
    sourceChain.noSwaps = 0;
    sourceChain.noSwappers = 0

  }
  sourceChain.noSwaps +=1;
  sourceChain.volume = sourceChain.volume.plus(event.params.amount);

  let UserAddressesID = event.transaction.from.toHex()
  let userAddresses = UserAddresses.load(UserAddressesID);
  if (!userAddresses){
    userAddresses = new UserAddresses(UserAddressesID);
    userAddresses.user_address = event.transaction.from.toHex();
    userAddresses.source_chain = sourceChain.id;
    userAddresses.save()
    sourceChain.noSwappers += 1
  }
  sourceChain.save();
  // end SourceChain entity


  // start DestinationChain entity
  let destinationChainId = event.params.destinationChain
  let destinationChain = DestinationChain.load(destinationChainId);
  if(!destinationChain) {
    destinationChain = new DestinationChain(destinationChainId);
    destinationChain.volume = new BigInt(0);
    destinationChain.avg_volume = new BigInt(0);
    destinationChain.destinationChain = event.params.destinationChain;
    destinationChain.symbol = event.params.symbol;
    destinationChain.noSwaps = 0;
  }
  destinationChain.noSwaps +=1;
  destinationChain.volume = destinationChain.volume.plus(event.params.amount);
  if (destinationChain.volume != new BigInt(0)){
    destinationChain.avg_volume = destinationChain.volume.div(BigInt.fromI32(destinationChain.noSwaps))
  }
  let destinationUsersID = event.params.destinationChain + '_' +event.transaction.from.toHex()
  let destinationUsers = DestinationUsers.load(destinationUsersID);
  if (!destinationUsers){
    destinationUsers = new DestinationUsers(destinationUsersID);
    destinationUsers.destination_chain = destinationChain.id;
    destinationUsers.save()
    destinationChain.noSwappers += 1
  }
  destinationChain.save();
  // end DestinationChain entity
  return;
}


// not used
export function handleGasAdded(event: GasAdded): void {
  return;
}

// not used
export function handleGasPaidForContractCall(event: GasPaidForContractCall): void {
  return;
}

// not used
export function handleGasPaidForContractCallWithToken(event: GasPaidForContractCallWithToken): void {
  return;
}

// not used
export function handleNativeGasAdded(event: NativeGasAdded): void {
  return;
}

// not used
export function handleNativeGasPaidForContractCall(event: NativeGasPaidForContractCall): void {
  return;
}