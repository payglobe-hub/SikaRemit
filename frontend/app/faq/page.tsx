import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'FAQ - SikaRemit',
  description: 'Frequently Asked Questions about SikaRemit services',
};

export default function FAQPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8">Frequently Asked Questions</h1>
        
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>What is SikaRemit?</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                SikaRemit is a comprehensive remittance and payment platform that allows you to send money, 
                make payments, and manage your finances securely and efficiently across multiple countries.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How do I get started?</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Simply create an account, complete the verification process, and you can start sending money 
                and making payments immediately. The process takes just a few minutes.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What countries do you support?</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                We support multiple African countries including Ghana, Nigeria, Kenya, South Africa, and more. 
                Our network is constantly expanding to serve more regions.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Is my money safe?</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Yes, we use industry-standard security measures including encryption, two-factor authentication, 
                and comply with all regulatory requirements to ensure your money is always safe.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What are the fees?</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Our fees are competitive and transparent. You'll see all fees before confirming any transaction. 
                Fees vary based on the amount, destination, and payment method.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
