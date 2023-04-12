import React, { useEffect, useState } from "react";
import "./App.css";
import { EthereumClient, w3mConnectors, w3mProvider } from "@web3modal/ethereum"
import { Web3Modal, Web3Button } from "@web3modal/react";
import { configureChains, createClient, WagmiConfig, useAccount } from "wagmi";
import { arbitrum, avalanche, bsc, fantom, gnosis, mainnet, optimism, polygon } from "wagmi/chains";
import { fetchSigner } from "@wagmi/core";
import { Client, DecodedMessage, SortDirection } from "@xmtp/xmtp-js";

const PEER_ADDRESS = "0x937C0d4a6294cdfa575de17382c7076b579DC176"; //bot address

// 1. Get projectID at https://cloud.walletconnect.com
if (!process.env.REACT_APP_PROJECT_ID) {
  throw new Error('You need to provide REACT_APP_PROJECT_ID env variable')
}
const projectId = process.env.REACT_APP_PROJECT_ID

// 2. Configure wagmi client
const chains = [mainnet, polygon, avalanche, arbitrum, gnosis, bsc, optimism, fantom]

const { provider } = configureChains(chains, [w3mProvider({ projectId })])
const wagmiClient = createClient({
  autoConnect: true,
  connectors: w3mConnectors({ version: 1, chains, projectId }),
  provider
})

// 3. Configure modal ethereum client
const ethereumClient = new EthereumClient(wagmiClient, chains)
type MessageListProps = {
  msg: DecodedMessage[];
};

// 4. Wrap your app with WagmiProvider and add <Web3Modal /> compoennt

export default function App() {
  const { isConnected } = useAccount()
  const [messages, setMessages] = useState<DecodedMessage[]>([]);
  const [client, setClient] = useState<any>();
  const [xmtpClientAddress, setXmtpClientAddress] = useState<any>();

  const initXmtp = async function() {
    const signer = await fetchSigner();
    const xmtp = await Client.create(signer, { env: "production" });
    const conversation = await xmtp.conversations.newConversation(PEER_ADDRESS);
    const messages = await conversation.messages({
      direction: SortDirection.SORT_DIRECTION_DESCENDING,
    });

    setClient(conversation);
    setMessages(messages);
    setXmtpClientAddress(xmtp.address);
  }

  useEffect(() => {
    if (xmtpClientAddress) {
      const streamMessages = async () => {
        const newStream = await client.streamMessages();
        for await (const msg of newStream) {
          setMessages((prevMessages) => {
            const messages = [...prevMessages];
            messages.unshift(msg);
            return messages;
          });
        }
      };
      streamMessages();
    }
  }, [client, xmtpClientAddress]);

  const onSendMessage = async () => {
    const message = "gm XMTP bot!";
    await client.send(message);
  };

  const MessageList: React.FC<MessageListProps> = ({ msg }) => {
    return (
      <ul>
        {msg.map((message, index) => (
          <li key={index}>{message.content}</li>
        ))}
      </ul>
    );
  };

  return (
    <div className="App">
      {/* <WagmiConfig client={wagmiClient}> */}
      <Web3Button/>
      {/* </WagmiConfig> */}

      <Web3Modal projectId={projectId} ethereumClient={ethereumClient} />
      {isConnected && xmtpClientAddress && (
        <>
          <MessageList msg={messages} />
          <button onClick={onSendMessage}>Send GM</button>
        </>
      )}
      {isConnected && !xmtpClientAddress && (
        <button onClick={initXmtp}>Connect to XMTP</button>
      )}
    </div>
  );
}
