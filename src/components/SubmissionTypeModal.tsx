import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Home, UserCheck, Building2 } from 'lucide-react';
import { type AgencyContext } from '@/hooks/useAgencyContext';

interface SubmissionTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  agentAgencyInfo: AgencyContext;
  onSubmitProperty: () => void;
  onSubmitIdDocuments: () => void;
}

const SubmissionTypeModal = ({
  isOpen,
  onClose,
  agentAgencyInfo,
  onSubmitProperty,
  onSubmitIdDocuments
}: SubmissionTypeModalProps) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-secura-teal" />
            Submit to {agentAgencyInfo.agencyName}
          </DialogTitle>
          <DialogDescription>
            Choose what you'd like to submit to {agentAgencyInfo.agencyName}
            {agentAgencyInfo.agentName && ` via ${agentAgencyInfo.agentName}`}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-secura-lime" onClick={onSubmitProperty}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Home className="w-6 h-6 mr-3 text-secura-teal" />
                Submit Property
              </CardTitle>
              <CardDescription>
                Submit properties from your portfolio to sell or get market evaluation
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                className="w-full bg-secura-lime hover:bg-secura-lime/90 text-secura-teal"
                onClick={onSubmitProperty}
              >
                Choose Properties
              </Button>
            </CardContent>
          </Card>

          <Card className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-secura-mint" onClick={onSubmitIdDocuments}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <UserCheck className="w-6 h-6 mr-3 text-secura-teal" />
                Submit ID Documents
              </CardTitle>
              <CardDescription>
                Submit your identity documents to register as a buyer or for verification
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <Button 
                variant="outline"
                className="w-full border-secura-teal text-secura-teal hover:bg-secura-mint"
                onClick={onSubmitIdDocuments}
              >
                Submit Documents
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SubmissionTypeModal;