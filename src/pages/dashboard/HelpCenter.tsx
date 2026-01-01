import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MessageCircle, Mail, Phone, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { supabase } from "@/integrations/supabase/client";

export default function HelpCenter() {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);

  // Check for existing active session on mount
  useEffect(() => {
    const checkExistingSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('id')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSession) {
        setChatSessionId(existingSession.id);
      }
    };

    checkExistingSession();
  }, []);

  const handleStartChat = () => {
    setChatOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Help Center</h1>
        <p className="text-muted-foreground mt-1">Get answers to your questions and support</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="border-primary/20 hover:border-primary/40 transition-colors cursor-pointer" onClick={handleStartChat}>
          <CardHeader>
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Live Chat</CardTitle>
            <CardDescription>Chat with our support team</CardDescription>
          </CardHeader>
          <CardContent>
            <Button className="w-full" onClick={(e) => { e.stopPropagation(); handleStartChat(); }}>Start Chat</Button>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
          <CardHeader>
            <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center mb-2">
              <Mail className="h-5 w-5 text-accent" />
            </div>
            <CardTitle>Email Support</CardTitle>
            <CardDescription>Send us an email</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">support@forexai.com</Button>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:border-primary/40 transition-colors cursor-pointer">
          <CardHeader>
            <div className="h-10 w-10 rounded-full bg-warning/10 flex items-center justify-center mb-2">
              <Phone className="h-5 w-5 text-warning" />
            </div>
            <CardTitle>Phone Support</CardTitle>
            <CardDescription>Call us directly</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full">+1 (555) 123-4567</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger>How do I deposit funds?</AccordionTrigger>
              <AccordionContent>
                Navigate to the Finances tab and click on "Deposit Crypto". Choose your preferred cryptocurrency and follow the instructions to complete your deposit. You can upload a screenshot of your payment confirmation for faster processing.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger>How do AI trading bots work?</AccordionTrigger>
              <AccordionContent>
                Our AI trading bots use advanced algorithms to analyze market trends and execute trades automatically. When you allocate funds to a bot, your investment is locked for a specific period, and you earn daily returns based on the bot's performance.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger>What is KYC verification?</AccordionTrigger>
              <AccordionContent>
                KYC (Know Your Customer) is a verification process to confirm your identity. Complete KYC verification to unlock higher deposit limits, withdrawal capabilities, and other premium features.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger>How long do withdrawals take?</AccordionTrigger>
              <AccordionContent>
                Withdrawal processing times vary depending on the method chosen. Cryptocurrency withdrawals typically take 24-48 hours, while M-Pesa withdrawals are processed within 1-3 business days after admin approval.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger>Can I cancel an active bot investment?</AccordionTrigger>
              <AccordionContent>
                No, once funds are allocated to a bot, they remain locked until the investment period ends. This ensures the bot can execute its trading strategy effectively. Your funds plus accumulated returns will be automatically released to your available balance when the period completes.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger>How do I update my profile information?</AccordionTrigger>
              <AccordionContent>
                Profile information is read-only for security purposes. If you need to update your details, go to Profile Settings and click "Request Profile Change". An admin will review and approve your request.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-accent/5">
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
          <CardDescription>Our support team is available 24/7</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            If you can't find the answer to your question in our FAQ, don't hesitate to reach out to our support team. We're here to help you succeed!
          </p>
          <Button className="w-full md:w-auto" onClick={handleStartChat}>
            <MessageCircle className="mr-2 h-4 w-4" />
            Contact Support
          </Button>
        </CardContent>
      </Card>

      <ChatWidget
        isOpen={chatOpen}
        onClose={() => setChatOpen(false)}
        sessionId={chatSessionId}
        onSessionCreated={(id) => setChatSessionId(id)}
      />
    </div>
  );
}
