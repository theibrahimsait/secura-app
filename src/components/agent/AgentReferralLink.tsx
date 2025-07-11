import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GradientText } from '@/components/ui/gradient-text';
import { useState } from 'react';

interface AgentReferralLinkProps {
  referralLink: string;
}

export const AgentReferralLink = ({ referralLink }: AgentReferralLinkProps) => {
  const { toast } = useToast();
  const [isCopying, setIsCopying] = useState(false);

  const copyToClipboard = async () => {
    if (referralLink) {
      setIsCopying(true);
      await navigator.clipboard.writeText(`${window.location.origin}${referralLink}`);
      toast({ 
        title: '✨ Magic link copied!', 
        description: 'Your special link is ready to share.' 
      });
      
      // Reset animation after it completes
      setTimeout(() => setIsCopying(false), 1000);
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-2xl">
          Your <GradientText className="font-semibold">Magic</GradientText> Link
        </CardTitle>
        <CardDescription>
          Share this special link with clients to instantly connect them to your agency. One link, infinite possibilities.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Input
          value={referralLink ? `${window.location.origin}${referralLink}` : ''}
          readOnly
          className="w-full"
          onClick={e => (e.target as HTMLInputElement).select()}
        />
        <Button
          onClick={copyToClipboard}
          className={`bg-secura-lime hover:bg-secura-lime/90 text-secura-black transition-all duration-300 ${
            isCopying ? 'scale-110 shadow-lg shadow-secura-lime/50' : ''
          }`}
          disabled={isCopying}
        >
          {isCopying ? (
            <>
              <Sparkles className="w-4 h-4 mr-1 animate-spin" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-1" />
              Copy Magic Link
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};