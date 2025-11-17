import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Bot, TrendingUp, Lock, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import MarketTicker from "@/components/MarketTicker";
const Index = () => {
  return <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">Wealthora.ai</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero opacity-10"></div>
        <div className="container mx-auto px-4 py-24 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Shield className="h-4 w-4" />
              Regulated & Secure Platform
            </div>
            
            <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
              AI-Powered Forex Trading
              <span className="block text-primary mt-2">Built for Everyone</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Lock your funds, allocate to our advanced AI trading bots, and earn competitive returns. 
              Professional-grade trading automation made accessible.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/auth">
                <Button size="lg" className="gap-2">
                  Start Trading <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button size="lg" variant="outline">
                  View Demo Dashboard
                </Button>
              </Link>
            </div>

            {/* Risk Warning */}
            <p className="text-xs text-muted-foreground pt-8 max-w-2xl mx-auto border-t border-border mt-12">
              <strong>Risk Warning:</strong> Trading leveraged FX instruments carries significant risk of loss. 
              Past performance does not guarantee future results. This platform does not guarantee returns.
            </p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-16">How It Works</h2>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            <div className="bg-card p-8 rounded-2xl border border-border shadow-md hover:shadow-lg transition-all">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                <Lock className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Lock Your Funds</h3>
              <p className="text-muted-foreground">
                Commit funds for a fixed period (14, 30, or 60 days). Your capital is secured in segregated accounts during the lock period.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl border border-border shadow-md hover:shadow-lg transition-all">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <Bot className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Allocate to AI Bots</h3>
              <p className="text-muted-foreground">
                Choose from Conservative, Balanced, or Aggressive trading strategies. Split your allocation across multiple bots.
              </p>
            </div>

            <div className="bg-card p-8 rounded-2xl border border-border shadow-md hover:shadow-lg transition-all">
              <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
                <TrendingUp className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-xl font-semibold mb-3">Earn Returns</h3>
              <p className="text-muted-foreground">
                At maturity, receive your principal plus net P&L minus fees. Track performance in real-time throughout the lock period.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bot Performance Preview */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">AI Trading Bots</h2>
            <p className="text-muted-foreground">
              Choose from multiple strategies, each with transparent historical performance and risk metrics
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[{
            name: "Conservative",
            risk: "Low",
            roi: "8-12%",
            sharpe: "1.8",
            color: "primary"
          }, {
            name: "Balanced",
            risk: "Medium",
            roi: "15-22%",
            sharpe: "1.5",
            color: "warning"
          }, {
            name: "Aggressive",
            risk: "High",
            roi: "25-35%",
            sharpe: "1.2",
            color: "destructive"
          }].map(bot => <div key={bot.name} className="bg-card p-6 rounded-xl border border-border">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">{bot.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full bg-${bot.color}/10 text-${bot.color}`}>
                    {bot.risk} Risk
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Expected ROI (APR)</span>
                    <span className="font-semibold text-accent">{bot.roi}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                    <span className="font-semibold">{bot.sharpe}</span>
                  </div>
                </div>
              </div>)}
          </div>

          <p className="text-xs text-muted-foreground text-center mt-8 max-w-3xl mx-auto">
            Historical backtest results based on 3-year simulation. Past performance is not indicative of future results.
          </p>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent"></div>
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center text-primary-foreground space-y-6">
            <h2 className="text-4xl font-bold">Ready to Start Trading?</h2>
            <p className="text-lg opacity-90">
              Complete KYC verification in minutes and start allocating to AI-powered trading strategies today.
            </p>
            <Link to="/auth">
              <Button size="lg" variant="secondary" className="gap-2">
                Create Account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Bot className="h-6 w-6 text-primary" />
                <span className="font-bold">Wealthora.ai</span>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-powered Forex trading platform with institutional-grade security.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-3">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Trading Bots</li>
                <li>Performance</li>
                <li>Pricing</li>
                <li>API</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Terms of Service</li>
                <li>Privacy Policy</li>
                <li>Risk Disclosure</li>
                <li>Compliance</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-3">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>System Status</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border mt-12 pt-8 text-center text-sm text-muted-foreground">
            <p>© 2025 Wealthora.ai. All rights reserved. This platform does not guarantee returns. Trading carries significant risk.</p>
          </div>
        </div>
      </footer>
      
      <MarketTicker />
    </div>;
};
export default Index;