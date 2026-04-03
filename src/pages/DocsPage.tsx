import { motion } from "framer-motion";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BloomPriceCard from "@/components/BloomPriceCard";
import { ExternalLink, BookOpen, HelpCircle } from "lucide-react";

const BLOOM_TOKEN_ADDRESS = "0xa07e759da6b3d4d75ed76f92fbcb867b9c145b07";

const faqItems = [
  {
    q: "What is Bloom?",
    a: "Bloom is an on-chain prediction game built on Base. Players bet whether ETH price will go UP or DOWN each round using $BLOOM tokens. Winners share the prize pool.",
  },
  {
    q: "How do I get $BLOOM tokens?",
    a: "You can purchase $BLOOM on decentralized exchanges on Base network. Check the token price card above for current DEX links and pricing.",
  },
  {
    q: "How does a round work?",
    a: "Each round has a betting phase (place your UP/DOWN prediction), followed by a lock phase (no more bets), then resolution when the ETH price is compared to the start price to determine winners.",
  },
  {
    q: "What are Phase Rewards?",
    a: "Rewards accumulate over 7-day phases. The longer your winning streak, the higher your reward multiplier. You can claim accumulated rewards at any time using the Rewards page.",
  },
  {
    q: "How are winnings calculated?",
    a: "Winners split the losing side's pool proportionally to their bet size. A small house edge is deducted. The more you bet relative to the winning pool, the bigger your share.",
  },
  {
    q: "Is my wallet safe?",
    a: "Bloom uses on-chain smart contracts on Base. You interact directly with the contract through your Farcaster wallet — we never have access to your private keys.",
  },
  {
    q: "What happens in a draw?",
    a: "If the ETH price doesn't change between round start and end, the round is considered a draw and bets are returned to participants.",
  },
  {
    q: "How does the leaderboard work?",
    a: "The leaderboard ranks players by profit, win rate, and bet volume. Filter by daily, weekly, or all-time periods to see where you stand among other players.",
  },
];

const docsContent = [
  {
    title: "Getting Started",
    content:
      "Open Bloom inside Farcaster to auto-connect your wallet. Make sure you have $BLOOM tokens on Base network. Head to the Action tab to start playing. Place your first bet during the betting window and watch the round resolve in real time.",
  },
  {
    title: "Betting Mechanics",
    content:
      "During the betting phase, choose UP if you think ETH price will rise or DOWN if you think it will fall. Set your $BLOOM stake amount (minimum stake applies). Once the betting window closes, the round locks and no more bets can be placed. After the round timer ends, the on-chain oracle resolves the round based on real ETH price data.",
  },
  {
    title: "Rewards & Phases",
    content:
      "The game operates in 7-day phases. Each phase tracks your participation and streak. Maintaining a winning streak increases your reward multiplier. Accumulated rewards can be claimed at any time via the BloomRewards smart contract, which uses backend-signed messages to verify your eligibility.",
  },
  {
    title: "Smart Contracts",
    content:
      "Bloom runs on audited smart contracts deployed on Base. BloomBetting handles round management, bet placement, and payouts. BloomRewards handles phase reward distribution via a pre-funded vault with oracle signature verification. All contract interactions happen through your connected wallet.",
  },
  {
    title: "Token Info",
    content: `$BLOOM is the native token powering the Bloom ecosystem on Base. Contract: ${BLOOM_TOKEN_ADDRESS.slice(0, 6)}…${BLOOM_TOKEN_ADDRESS.slice(-4)}. It's used for betting, rewards, and governance. The token is tradable on Base DEX platforms.`,
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

          <a
            href={`https://basescan.org/token/${BLOOM_TOKEN_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-xs text-primary hover:underline justify-center py-2"
          >
            View contract on BaseScan <ExternalLink className="w-3 h-3" />
          </a>
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
