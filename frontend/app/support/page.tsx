import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Support - SikaRemit',
  description: 'Get help and support for your SikaRemit account and transactions',
};

export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-8">Support Center</h1>
        
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">How Can We Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-lg">
              We're here to help you with any questions or issues you may have. Find answers to common questions 
              or contact our support team for personalized assistance.
            </CardDescription>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Quick Help</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold">Account Issues</h4>
                  <p className="text-sm text-gray-600">Login problems, password reset, account verification</p>
                </div>
                <div>
                  <h4 className="font-semibold">Transaction Help</h4>
                  <p className="text-sm text-gray-600">Send money, payment status, transaction history</p>
                </div>
                <div>
                  <h4 className="font-semibold">Security & Safety</h4>
                  <p className="text-sm text-gray-600">Account security, fraud prevention, 2FA setup</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contact Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold">Email Support</h4>
                  <p className="text-sm">support@sikaremit.com</p>
                  <p className="text-xs text-gray-600">Response within 24 hours</p>
                </div>
                <div>
                  <h4 className="font-semibold">Live Chat</h4>
                  <p className="text-sm">Available 9 AM - 6 PM GMT</p>
                  <p className="text-xs text-gray-600">Instant help for urgent issues</p>
                </div>
                <div>
                  <h4 className="font-semibold">Phone Support</h4>
                  <p className="text-sm">+233 XXX XXX XXX</p>
                  <p className="text-xs text-gray-600">Mon-Fri, 9 AM - 5 PM</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Common Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Why can't I log in?</h4>
                  <p className="text-sm text-gray-600">
                    Check your email and password, ensure your account is verified, or try resetting your password 
                    if you've forgotten it.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Where is my transaction?</h4>
                  <p className="text-sm text-gray-600">
                    Check your transaction history for real-time updates. Some transactions may take a few minutes 
                    to process depending on the payment method.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">How do I verify my account?</h4>
                  <p className="text-sm text-gray-600">
                    Complete the KYC process by uploading valid identification documents. This usually takes 
                    1-2 business days to review.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resources</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Self-Service</h4>
                  <ul className="text-sm space-y-1">
                    <li>• <a href="/faq" className="text-blue-600 hover:underline">FAQ Page</a></li>
                    <li>• Transaction History</li>
                    <li>• Account Settings</li>
                    <li>• Security Settings</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Documentation</h4>
                  <ul className="text-sm space-y-1">
                    <li>• <a href="/api" className="text-blue-600 hover:underline">API Documentation</a></li>
                    <li>• User Guides</li>
                    <li>• Tutorial Videos</li>
                    <li>• Best Practices</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Report an Issue</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              If you're experiencing technical issues or have found a bug, please let us know. 
              Include details about your device, browser, and steps to reproduce the issue.
            </CardDescription>
            <div className="mt-4">
              <p className="text-sm">
                <strong>Email:</strong> tech-support@sikaremit.com<br/>
                <strong>Response Time:</strong> Within 48 hours for technical issues
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
