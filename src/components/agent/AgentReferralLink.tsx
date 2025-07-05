import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AgentReferralLinkProps {
  referralLink: string;
}

export const AgentReferralLink = ({ referralLink }: AgentReferralLinkProps) => {
  const { toast } = useToast();

  const copyToClipboard = async () => {
    if (referralLink) {
      await navigator.clipboard.writeText(`${window.location.origin}${referralLink}`);
      toast({ title: 'Copied!', description: 'Referral link copied to clipboard.' });
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Permanent Referral Link</CardTitle>
        <CardDescription>
          This is your permanent referral link. Share it with clients to onboard them. The link will always be the same.
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
          variant="outline"
          onClick={copyToClipboard}
        >
          <Copy className="w-4 h-4 mr-1" /> Copy
        </Button>
      </CardContent>
    </Card>
  );
};