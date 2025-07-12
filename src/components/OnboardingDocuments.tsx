import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OnboardingDocumentsProps {
  documents: File[];
  loading: boolean;
  onDocumentUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveDocument: (index: number) => void;
}

const OnboardingDocuments: React.FC<OnboardingDocumentsProps> = ({
  documents,
  loading,
  onDocumentUpload,
  onRemoveDocument
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Upload ID Documents</CardTitle>
          <CardDescription>
            Upload your identification documents (passport, national ID, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="documents">Identity Documents</Label>
            <Input
              id="documents"
              type="file"
              multiple
              accept="image/*,.pdf"
              onChange={onDocumentUpload}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload images or PDF files. You can select multiple files.
            </p>
          </div>

          {documents.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Documents:</Label>
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded">
                  <span className="text-sm truncate">{doc.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveDocument(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}

          <p className="text-sm text-gray-600 mt-4">
            You can upload documents now or skip this step and add them later from your dashboard.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingDocuments;