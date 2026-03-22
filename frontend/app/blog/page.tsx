import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'Blog - SikaRemit',
  description: 'Latest news, updates, and insights from SikaRemit',
};

export default function BlogPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-center mb-6">SikaRemit Blog</h1>
        
        <Card className="mb-4">
          <CardHeader>
            <CardTitle className="text-xl">Latest Updates & Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              Stay updated with the latest news, tips, and insights about remittances, digital payments, 
              and financial technology in Africa.
            </CardDescription>
          </CardContent>
        </Card>

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Welcome to SikaRemit!</CardTitle>
              <CardDescription>March 2024</CardDescription>
            </CardHeader>
            <CardContent>
              <CardDescription>
                We're excited to launch SikaRemit, your trusted partner for secure and affordable remittances 
                across Africa. Learn more about our features and how we're making cross-border payments simpler.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>The Future of Digital Remittances in Africa</CardTitle>
              <CardDescription>Coming Soon</CardDescription>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Explore how digital transformation is reshaping the remittance landscape in Africa and what 
                it means for you and your family.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to Send Money Securely: Best Practices</CardTitle>
              <CardDescription>Coming Soon</CardDescription>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Learn important tips and best practices for sending money safely and securely to your loved ones.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Understanding Exchange Rates and Fees</CardTitle>
              <CardDescription>Coming Soon</CardDescription>
            </CardHeader>
            <CardContent>
              <CardDescription>
                A comprehensive guide to understanding exchange rates, fees, and how to get the best value 
                when sending money internationally.
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Subscribe to Our Newsletter</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Get the latest updates, tips, and insights delivered directly to your inbox. 
              Join our community and stay informed about the future of remittances.
            </CardDescription>
            <div className="mt-4">
              <p className="text-sm">
                <strong>Coming Soon:</strong> Newsletter subscription feature
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
