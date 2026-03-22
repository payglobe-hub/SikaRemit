import { Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'API Documentation - SikaRemit',
  description: 'API documentation and developer resources for SikaRemit platform',
};

export default function APIPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-6">API Documentation</h1>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl">Developer Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-base">
              Welcome to the SikaRemit API documentation. Here you'll find everything you need to 
              integrate with our platform and build amazing financial applications.
            </CardDescription>
          </CardContent>
        </Card>

        <div className="grid gap-4 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Getting Started</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Our RESTful API allows you to integrate SikaRemit's payment and remittance services 
                into your applications. Get started with our comprehensive documentation and examples.
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Key Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li>• Secure authentication with JWT tokens</li>
                <li>• Real-time exchange rates</li>
                <li>• Payment processing and transfers</li>
                <li>• User management and KYC</li>
                <li>• Transaction history and reporting</li>
                <li>• Webhook notifications</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Authentication</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                All API requests require authentication using JWT tokens. Include your access token 
                in the Authorization header: <br/>
                <code className="bg-gray-100 p-1 rounded">Authorization: Bearer &lt;token&gt;</code>
              </CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Base URL</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Production API: <br/>
                <code className="bg-gray-100 p-1 rounded">https://sikaremit.onrender.com/api/v1/</code>
              </CardDescription>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Popular Endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold mb-2">Authentication</h4>
                <ul className="text-sm space-y-1 font-mono">
                  <li>POST /auth/login/</li>
                  <li>POST /auth/register/</li>
                  <li>POST /auth/refresh/</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Payments</h4>
                <ul className="text-sm space-y-1 font-mono">
                  <li>GET /payments/currencies/</li>
                  <li>GET /payments/exchange-rates/</li>
                  <li>POST /payments/transfer/</li>
                </ul>
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm">
                <strong>Interactive API Documentation:</strong> 
                Visit <code className="bg-gray-100 p-1 rounded">/api/docs/</code> for interactive testing
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Need Help?</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Our developer support team is here to help you integrate with our API. 
              Contact us at developers@sikaremit.com for technical assistance.
            </CardDescription>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
