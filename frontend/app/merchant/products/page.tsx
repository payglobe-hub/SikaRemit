'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

// Prevent static generation for this page since it uses functions that can't be serialized
export const dynamic = 'force-dynamic'
export const runtime = 'edge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Search,
  Package,
  Edit,
  Trash2,
  Eye,
  ToggleLeft,
  ToggleRight,
  AlertTriangle,
  Activity,
  TrendingUp,
  DollarSign,
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { useCurrency } from '@/hooks/useCurrency'
import { useToast } from '@/hooks/use-toast'
import * as ProductsAPI from '@/lib/api/products'
import * as StoresAPI from '@/lib/api/stores'
import { ImageUpload } from '@/components/ImageUpload'

export default function MerchantProductsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [storeFilter, setStoreFilter] = useState('all')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<ProductsAPI.Product | null>(null)
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    sku: '',
    stock_quantity: '',
    low_stock_threshold: '5',
    store_id: ''
  })

  const { formatAmount } = useCurrency()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: products, isLoading } = useQuery({
    queryKey: ['merchant-products', searchTerm, storeFilter],
    queryFn: () => ProductsAPI.getProducts({
      search: searchTerm || undefined,
      store_id: storeFilter !== 'all' ? storeFilter : undefined
    })
  })

  const { data: stores } = useQuery({
    queryKey: ['merchant-stores'],
    queryFn: StoresAPI.getStores
  })

  const createProductMutation = useMutation({
    mutationFn: (data: ProductsAPI.CreateProductData) => ProductsAPI.createProduct(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-products'] })
      toast({
        title: 'Success',
        description: 'Product created successfully'
      })
      setIsCreateDialogOpen(false)
      setFormData({
        name: '',
        description: '',
        price: '',
        sku: '',
        stock_quantity: '',
        low_stock_threshold: '5',
        store_id: ''
      })
      setSelectedImage(null)
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create product',
        variant: 'destructive'
      })
    }
  })

  const toggleProductMutation = useMutation({
    mutationFn: ({ id, is_available }: { id: string; is_available: boolean }) => 
      ProductsAPI.toggleProductAvailability(id, is_available),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-products'] })
      toast({
        title: 'Success',
        description: 'Product availability updated'
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update product',
        variant: 'destructive'
      })
    }
  })

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => ProductsAPI.deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-products'] })
      toast({
        title: 'Success',
        description: 'Product deleted successfully'
      })
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete product',
        variant: 'destructive'
      })
    }
  })

  const handleCreateProduct = () => {
    if (formData.name.trim() && formData.price && formData.stock_quantity && formData.store_id) {
      const productData: ProductsAPI.CreateProductData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        sku: formData.sku,
        stock_quantity: parseInt(formData.stock_quantity),
        low_stock_threshold: parseInt(formData.low_stock_threshold),
        store_id: formData.store_id,
        image: selectedImage || undefined
      }
      createProductMutation.mutate(productData)
    }
  }

  const handleToggleProduct = (product: ProductsAPI.Product) => {
    toggleProductMutation.mutate({ id: product.id, is_available: !product.is_available })
  }

  const handleDeleteProduct = (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProductMutation.mutate(id)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Hero Section */}
      <div className="relative py-16 lg:py-24 overflow-hidden bg-gradient-to-br from-blue-50/30 via-blue-50/20 to-blue-50/30">
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-gradient-to-r from-blue-400/20 to-blue-300/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-gradient-to-r from-blue-400/15 to-indigo-400/15 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-conic from-blue-500/5 via-transparent to-blue-400/5 rounded-full blur-2xl animate-spin" style={{animationDuration: '20s'}}></div>
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto animate-in slide-in-from-bottom duration-1000">
            <div className="inline-flex items-center px-6 py-3 rounded-full bg-white/40 backdrop-blur-xl border border-white/30 shadow-lg shadow-blue-500/5 text-slate-700 text-sm font-semibold mb-8 animate-in zoom-in-50 duration-700 delay-300 hover:bg-white/50 hover:scale-105 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/10 group">
              <Package className="w-5 h-5 mr-3 text-blue-600 group-hover:rotate-12 transition-transform duration-300" />
              Product Management
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-tight animate-in slide-in-from-bottom duration-1000 delay-500">
              Comprehensive Inventory
              <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">Manage products, pricing, and stock levels</span>
            </h1>
            <p className="text-lg text-slate-600/90 mb-8 max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom duration-1000 delay-700 font-medium">
              Maintain accurate inventory across all stores with real-time stock tracking, automated alerts, and comprehensive product management tools.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-in slide-in-from-bottom duration-1000 delay-900">
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Package className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Product catalog</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Activity className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Stock monitoring</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <DollarSign className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Pricing control</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 lg:px-8 space-y-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-sikaremit-muted">Total Products</p>
                  <p className="text-3xl font-bold text-sikaremit-foreground">{products?.length || 0}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Package className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-sikaremit-muted">Available</p>
                  <p className="text-3xl font-bold text-sikaremit-foreground">{products?.filter((p: any) => p.is_available).length || 0}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <CheckCircle className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-sikaremit-muted">Low Stock</p>
                  <p className="text-3xl font-bold text-sikaremit-foreground">{products?.filter((p: any) => p.stock_quantity <= p.low_stock_threshold).length || 0}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <AlertCircle className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-sikaremit-card/80 backdrop-blur-sm group cursor-pointer border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 relative overflow-hidden">
            <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

            <CardContent className="relative z-10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-sikaremit-muted">Total Value</p>
                  <p className="text-3xl font-bold text-sikaremit-foreground">
                    {formatAmount(products?.reduce((sum: number, p: any) => sum + (p.price * p.stock_quantity), 0) || 0)}
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Create */}
        <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-1 duration-700">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-400/20 to-blue-300/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>

          <CardContent className="p-6 relative z-10">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search products by name, SKU, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl shadow-sm"
                  />
                </div>
              </div>

              <Select value={storeFilter} onValueChange={setStoreFilter}>
                <SelectTrigger className="w-48 h-12 border-2 border-gray-200 dark:border-gray-700 rounded-xl">
                  <Package className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter by store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {stores?.map((store: any) => (
                    <SelectItem key={store.id} value={store.name}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-500 font-semibold hover:scale-105 relative overflow-hidden group h-12 px-6 rounded-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-lg">
                  <DialogHeader>
                    <DialogTitle>Add New Product</DialogTitle>
                    <DialogDescription>
                      Create a new product and add it to your inventory.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Product Image</Label>
                      <ImageUpload
                        onImageSelect={setSelectedImage}
                        className="mt-2"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Product Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter product name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="sku">SKU</Label>
                        <Input
                          id="sku"
                          name="sku"
                          value={formData.sku}
                          onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                          placeholder="Enter SKU"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        name="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter product description"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="price">Price</Label>
                        <Input
                          id="price"
                          name="price"
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="store">Store</Label>
                        <Select value={formData.store_id} onValueChange={(value) => setFormData(prev => ({ ...prev, store_id: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select store" />
                          </SelectTrigger>
                          <SelectContent>
                            {stores?.map((store: any) => (
                              <SelectItem key={store.id} value={store.id}>
                                {store.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="stock">Stock Quantity</Label>
                        <Input
                          id="stock"
                          name="stock"
                          type="number"
                          value={formData.stock_quantity}
                          onChange={(e) => setFormData(prev => ({ ...prev, stock_quantity: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="threshold">Low Stock Threshold</Label>
                        <Input
                          id="threshold"
                          type="number"
                          value={formData.low_stock_threshold}
                          onChange={(e) => setFormData(prev => ({ ...prev, low_stock_threshold: e.target.value }))}
                          placeholder="5"
                        />
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateProduct}
                      disabled={createProductMutation.isPending || !formData.name.trim() || !formData.price || !formData.stock_quantity || !formData.store_id}
                    >
                      {createProductMutation.isPending ? 'Creating...' : 'Add Product'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Products Table */}
        <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-2 duration-700">
          <div className="absolute inset-0 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800"></div>

          <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                  <Package className="w-7 h-7 mr-3 text-orange-600" />
                  Product Catalog
                </CardTitle>
                <CardDescription className="text-gray-600 dark:text-gray-400 text-lg mt-1">
                  {products?.length || 0} products in inventory • Manage pricing and stock levels
                </CardDescription>
              </div>
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                Inventory Management
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0 relative z-10">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                      <TableHead>
                        <Button variant="ghost" className="h-auto p-0 font-semibold text-gray-900 dark:text-white hover:text-orange-600">
                          Product
                        </Button>
                      </TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Store</TableHead>
                      <TableHead>
                        <Button variant="ghost" className="h-auto p-0 font-semibold text-gray-900 dark:text-white hover:text-orange-600">
                          Price
                        </Button>
                      </TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products?.map((product: any, index: number) => (
                      <TableRow
                        key={product.id}
                        data-testid="product-item"
                        className="group border-b border-gray-100 dark:border-gray-700 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-transparent dark:hover:from-blue-950/20 dark:hover:to-transparent transition-all duration-300 animate-in slide-in-from-left duration-500"
                        style={{ animationDelay: `${index * 50}ms` }}
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg flex items-center justify-center">
                                <Package className="w-5 h-5 text-blue-600" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
                                {product.description}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                            {product.sku}
                          </div>
                        </TableCell>
                        <TableCell>{product.store_name}</TableCell>
                        <TableCell>
                          <div className="font-semibold text-lg text-gray-900 dark:text-white">
                            {formatAmount(product.price)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center space-x-2 ${product.stock_quantity <= product.low_stock_threshold ? 'text-red-600' : ''}`}>
                            <span className="font-medium">
                              {product.stock_quantity}
                            </span>
                            {product.stock_quantity <= product.low_stock_threshold && (
                              <AlertTriangle className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={product.is_available ? "default" : "secondary"} className={product.is_available ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}>
                            {product.is_available ? 'Available' : 'Unavailable'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleProduct(product)}
                              disabled={toggleProductMutation.isPending}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              {product.is_available ? (
                                <ToggleRight className="w-4 h-4 text-green-600" />
                              ) : (
                                <ToggleLeft className="w-4 h-4 text-gray-400" />
                              )}
                            </Button>

                            <Button variant="ghost" size="sm" className="hover:bg-blue-50 dark:hover:bg-blue-950/30">
                              <Eye className="w-4 h-4 text-blue-600" />
                            </Button>

                            <Button variant="ghost" size="sm" className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <Edit className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteProduct(product.id)}
                              disabled={deleteProductMutation.isPending}
                              className="hover:bg-red-50 dark:hover:bg-red-950/20 text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {products?.length === 0 && !isLoading && (
              <div className="text-center py-16">
                <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Package className="w-12 h-12 text-gray-400" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  No products found
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                  Start building your catalog by adding your first product
                </p>
                <Button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
