import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface OnboardingProfileProps {
  profileData: {
    fullName: string;
    email: string;
  };
  onProfileChange: (data: { fullName: string; email: string }) => void;
}

const OnboardingProfile: React.FC<OnboardingProfileProps> = ({
  profileData,
  onProfileChange
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Complete Your Profile</CardTitle>
          <CardDescription>
            Let's set up your profile information
          </CardDescription>
        </CardHeader>
        <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name *</Label>
            <Input
              id="fullName"
              value={profileData.fullName}
              onChange={(e) => onProfileChange({ ...profileData, fullName: e.target.value })}
              placeholder="Enter your full name"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={profileData.email}
              onChange={(e) => onProfileChange({ ...profileData, email: e.target.value })}
              placeholder="Enter your email"
              required
            />
          </div>
        </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingProfile;