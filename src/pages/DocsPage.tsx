import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BloomPriceCard from "@/components/BloomPriceCard";
import { ExternalLink, BookOpen, HelpCircle } from "lucide-react";

const BLOOM_TOKEN_ADDRESS = "0xa07e759da6b3d4d75ed76f92fbcb867b9c145b07";
const BETTING_CONTRACT = "0x9cE39DDf290094e9915E2D908b6D99e33167c977";
const REWARDS_CONTRACT = "0xf077988E175f5EeCDa4d7cbab6881Dd148E24152";
const APP_URL = "https://hyperwavex.xyz";

const shortAddr = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

const faqItems = [
  {
    q: "What is HyperWave?",
    a: "HyperWave is an on-chain prediction game on Base, live at hyperwavex.xyz. Players predict whether the ETH price will go UP or DOWN each round using $BLOOM tokens. Winners share the prize pool.",
  },
  {
    q: "Where can I play?",
    a: "Play in your browser at hyperwavex.xyz, or open HyperWave as a mini app inside Farcaster for instant wallet connection.",
  },
  {
    q: "How do I get $BLOOM tokens?",
    a: "You can buy $BLOOM on decentralized exchanges on Base. Check the token price card above for live pricing and DEX links.",
  },
  {
    q: "How does a round work?",
    a: "Each round has a betting window (place your UP/DOWN prediction), then a lock period with no more bets, then resolution when the ETH price is compared to the round's start price.",
  },
  {
    q: "What are Phase Rewards?",
    a: "Rewards build up over 7-day phases. You can claim once per phase. After you claim, your next claim unlocks when the current phase ends.",
  },
  {
    q: "How does the streak multiplier work?",
    a: "Playing every day of a phase earns a 7-day streak, which doubles your phase payout to 2x. Without a streak you still claim your normal rewards.",
  },
  {
    q: "Why did my claim not register?",
    a: "A claim is only recorded after the transaction is confirmed on Base. If you cancel or the transaction fails, nothing is locked and you can claim again.",
  },
  {
    q: "How are winnings calculated?",
    a: "Winners split the losing side's pool proportionally to their stake. A small house edge is deducted, so a correct prediction pays up to 2x your stake.",
  },
  {
    q: "Is my wallet safe?",
    a: "Every action runs through public smart contracts on Base and is signed by your own wallet. Your private keys are never shared with us.",
  },
  {
    q: "What happens in a draw?",
    a: "If the ETH price is unchanged between round start and end, the round is a draw and stakes are returned to participants.",
  },
  {
    q: "How does the leaderboard work?",
    a: "The leaderboard ranks players by wins, profit and volume, showing Farcaster usernames and avatars. Filter by daily, weekly or all-time.",
  },
  {
    q: "Can bots or agents play?",
    a: "Yes. HyperWave exposes a public tool server at hyperwavex.xyz for reading rounds, player records, the leaderboard and prices, and for preparing bet transactions that the agent signs with its own wallet.",
  },
];

const docsContent = [
  {
    title: "Getting Started",
    content: `HyperWave is live at ${APP_URL.replace("https://", "")}. Open it in your browser and connect a Base wallet, or launch it inside Farcaster for automatic wallet connection. Make sure you hold $BLOOM on Base, then head to the Action tab and place your first prediction during the betting window.`,
  },
  {
    title: "Betting Mechanics",
    content:
      "During the betting window, choose UP if you think ETH will rise or DOWN if you think it will fall, then set your $BLOOM stake (a minimum applies). When the window closes the round locks, and once the timer ends the oracle settles the round against real ETH price data. Correct predictions pay up to 2x.",
  },
  {
    title: "Rewards & Phases",
    content:
      "The game runs in 7-day phases. Each phase tracks your plays and daily streak. You can claim once per phase; a full 7-day streak doubles your payout to 2x. After claiming, your next claim unlocks when the current phase ends. Claims are signed by the backend and only recorded once confirmed on Base.",
  },
  {
    title: "Claim History & Sharing",
    content:
      "The Rewards tab keeps a claim history with the phase number, payout, multiplier, timestamp and a BaseScan link for every confirmed claim. After each claim — and after every round result — you can share a PnL card straight to Farcaster.",
  },
  {
    title: "Smart Contracts",
    content: `HyperWave runs on public contracts on Base. Betting: ${shortAddr(BETTING_CONTRACT)} handles rounds, stakes and payouts. Rewards: ${shortAddr(REWARDS_CONTRACT)} distributes phase rewards from a pre-funded vault with oracle signature verification. Every interaction is signed by your own wallet.`,
  },
  {
    title: "Token Info",
    content: `$BLOOM is the only staking token on HyperWave. Contract: ${shortAddr(BLOOM_TOKEN_ADDRESS)} on Base. It is used for predictions and phase rewards, and is tradable on Base DEX platforms.`,
  },
  {
    title: "For Agents & Developers",
    content: `Autonomous agents can connect to the public HyperWave tool server at ${APP_URL.replace("https://", "")} to read the live round, past rounds, player stats, the leaderboard and $BLOOM/ETH prices, and to prepare unsigned Base transactions for placing bets. The server never signs transactions or holds funds — the agent's own wallet does.`,
  },
];

const DocsPage = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-md mx-auto space-y-5"
    >
      <motion.div
        className="text-center mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-lg font-display uppercase tracking-widest text-muted-foreground mb-1">
          Docs & <span className="text-primary text-glow-primary">FAQ</span>
        </h2>
        <p className="text-xs text-muted-foreground">
          Everything you need to know about Bloom
        </p>
      </motion.div>

      {/* BLOOM Price */}
      <BloomPriceCard />

      <Tabs defaultValue="docs" className="w-full">
        <TabsList className="w-full grid grid-cols-2 bg-muted/30">
          <TabsTrigger value="docs" className="gap-1.5 text-xs">
            <BookOpen className="w-3.5 h-3.5" /> Docs
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-1.5 text-xs">
            <HelpCircle className="w-3.5 h-3.5" /> FAQ
          </TabsTrigger>
        </TabsList>

        <TabsContent value="docs" className="mt-3 space-y-3">
          {docsContent.map((doc, i) => (
            <motion.div
              key={doc.title}
              className="glass rounded-xl p-4 border border-border/50"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <h3 className="text-sm font-display uppercase tracking-wider text-foreground mb-2">
                {doc.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {doc.content}
              </p>
            </motion.div>
          ))}

          <div className="flex flex-col items-center gap-2 py-2">
            <a
              href={APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-primary hover:underline"
            >
              hyperwavex.xyz <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`https://basescan.org/token/${BLOOM_TOKEN_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-primary hover:underline"
            >
              $BLOOM token on BaseScan <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`https://basescan.org/address/${BETTING_CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-primary hover:underline"
            >
              Betting contract on BaseScan <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href={`https://basescan.org/address/${REWARDS_CONTRACT}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-xs text-primary hover:underline"
            >
              Rewards contract on BaseScan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </TabsContent>

        <TabsContent value="faq" className="mt-3">
          <Accordion type="single" collapsible className="space-y-2">
            {faqItems.map((item, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="glass rounded-xl border border-border/50 px-4"
              >
                <AccordionTrigger className="text-xs text-foreground hover:no-underline py-3">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-xs text-muted-foreground leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default DocsPage;
