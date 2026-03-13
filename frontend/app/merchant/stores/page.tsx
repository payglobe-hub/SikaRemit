'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

// Prevent static generation for this page since it uses functions that can't be serialized
export const dynamic = 'force-dynamic'
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Search,
  Store,
  Edit,
  Trash2,
  Eye,
  Package,
  ToggleLeft,
  ToggleRight,
  Activity,
  TrendingUp,
  ShoppingBag
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import * as StoresAPI from '@/lib/api/stores'

export default function MerchantStoresPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingStore, setEditingStore] = useState<StoresAPI.Store | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })

  const { toast } = useToast()
  const queryClient = useQueryClient()

  const { data: stores, isLoading } = useQuery({
    queryKey: ['merchant-stores', searchTerm],
    queryFn: StoresAPI.getStores
  })

  const createStoreMutation = useMutation({
    mutationFn: StoresAPI.createStore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-stores'] })
      toast({ title: 'Success', description: 'Store created successfully' })
      setIsCreateDialogOpen(false)
      setFormData({ name: '', description: '' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to create store', variant: 'destructive' })
    }
  })

  const toggleStoreMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) => 
      StoresAPI.updateStore(id, { is_active } as any),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-stores'] })
      toast({ title: 'Success', description: 'Store status updated' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to update store', variant: 'destructive' })
    }
  })

  const deleteStoreMutation = useMutation({
    mutationFn: StoresAPI.deleteStore,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchant-stores'] })
      toast({ title: 'Success', description: 'Store deleted successfully' })
    },
    onError: (error: any) => {
      toast({ title: 'Error', description: error.response?.data?.message || 'Failed to delete store', variant: 'destructive' })
    }
  })

  const handleCreateStore = () => {
    if (formData.name.trim()) {
      createStoreMutation.mutate(formData)
    }
  }

  const handleToggleStore = (store: StoresAPI.Store) => {
    toggleStoreMutation.mutate({ id: store.id, is_active: !store.is_active })
  }

  const handleDeleteStore = (id: string) => {
    if (confirm('Are you sure you want to delete this store?')) {
      deleteStoreMutation.mutate(id)
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
              <Store className="w-5 h-5 mr-3 text-blue-600 group-hover:rotate-12 transition-transform duration-300" />
              Store Management
            </div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 mb-6 leading-tight animate-in slide-in-from-bottom duration-1000 delay-500">
              Multi-Store Operations
              <span className="block bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400 bg-clip-text text-transparent drop-shadow-sm">Organize your products across multiple stores</span>
            </h1>
            <p className="text-lg text-slate-600/90 mb-8 max-w-2xl mx-auto leading-relaxed animate-in slide-in-from-bottom duration-1000 delay-700 font-medium">
              Create and manage multiple store locations, organize your inventory, and track performance across all your retail outlets.
            </p>
            <div className="flex flex-col sm:flex-row gap-6 justify-center animate-in slide-in-from-bottom duration-1000 delay-900">
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Store className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Store organization</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Activity className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Performance tracking</span>
              </div>
              <div className="flex items-center space-x-3 bg-white/40 backdrop-blur-sm px-4 py-3 rounded-xl border border-white/30 shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105 hover:bg-white/50 group">
                <Package className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform duration-300" />
                <span className="text-slate-700 font-medium">Inventory management</span>
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
                  <p className="text-sm font-medium text-sikaremit-muted">Total Stores</p>
                  <p className="text-3xl font-bold text-sikaremit-foreground">{stores?.length || 0}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Store className="h-5 w-5 text-white" />
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
                  <p className="text-sm font-medium text-sikaremit-muted">Active Stores</p>
                  <p className="text-3xl font-bold text-sikaremit-foreground">{stores?.filter((s: any) => s.is_active).length || 0}</p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <TrendingUp className="h-5 w-5 text-white" />
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
                  <p className="text-sm font-medium text-sikaremit-muted">Total Products</p>
                  <p className="text-3xl font-bold text-sikaremit-foreground">{stores?.reduce((sum: number, store: any) => sum + store.products_count, 0) || 0}</p>
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
                  <p className="text-sm font-medium text-sikaremit-muted">Avg Products/Store</p>
                  <p className="text-3xl font-bold text-sikaremit-foreground">
                    {stores?.length ? Math.round((stores.reduce((sum: number, store: any) => sum + store.products_count, 0) / stores.length)) : 0}
                  </p>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <ShoppingBag className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Create */}
        <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-1 duration-700">
          <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-800 dark:to-gray-800"></div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>

          <CardContent className="p-6 relative z-10">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    placeholder="Search stores by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 text-base border-2 border-gray-200 dark:border-gray-700 focus:border-blue-500 dark:focus:border-blue-400 rounded-xl shadow-sm"
                  />
                </div>
              </div>

              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600 shadow-2xl shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-500 font-semibold hover:scale-105 relative overflow-hidden group h-12 px-6 rounded-xl">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Store
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Create New Store</DialogTitle>
                    <DialogDescription>
                      Add a new store to organize your products and inventory.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Store Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter store name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Enter store description"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreateStore}
                      disabled={createStoreMutation.isPending || !formData.name.trim()}
                    >
                      {createStoreMutation.isPending ? 'Creating...' : 'Create Store'}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Stores Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            [...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse border-0 shadow-xl bg-white dark:bg-gray-900">
                <CardContent className="p-6">
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </CardContent>
              </Card>
            ))
          ) : stores?.map((store: any, index: number) => (
            <Card key={store.id} className="group relative overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 bg-white/40 backdrop-blur-xl border border-white/30 shadow-xl shadow-blue-500/5 hover:shadow-blue-500/10 animate-in slide-in-from-bottom duration-500"
                  style={{ animationDelay: `${index * 100}ms` }}>
              <div className={`absolute inset-0 bg-gradient-to-br ${'from-blue-50 to-blue-100 dark:from-blue-950/20 dark:to-blue-900/20'} opacity-0 group-hover:opacity-100 transition-all duration-500`} />
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-white/10 to-transparent rounded-full -mr-10 -mt-10"></div>

              <CardHeader className="relative z-10 border-b border-gray-200 dark:border-gray-700 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg shadow-lg group-hover:scale-110 transition-transform duration-300">
                      <Store className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-sikaremit-foreground">{store.name}</CardTitle>
                      <Badge variant={store.is_active ? "default" : "secondary"} className={`mt-1 ${store.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : ''}`}>
                        {store.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleToggleStore(store)}
                    disabled={toggleStoreMutation.isPending}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    {store.is_active ? (
                      <ToggleRight className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <ToggleLeft className="w-5 h-5 text-gray-400" />
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="relative z-10 pt-4 space-y-4">
                <CardDescription className="text-gray-600 dark:text-gray-400">
                  {store.description}
                </CardDescription>

                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span className="flex items-center">
                    <Package className="w-4 h-4 mr-1" />
                    {store.products_count} products
                  </span>
                  <span>Created {new Date(store.created_at).toLocaleDateString()}</span>
                </div>

                <div className="flex space-x-2 pt-2">
                  <Button variant="outline" size="sm" className="flex-1 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Eye className="w-4 h-4 mr-2" />
                    View
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Package className="w-4 h-4 mr-2" />
                    Products
                  </Button>
                  <Button variant="outline" size="sm" className="border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteStore(store.id)}
                    disabled={deleteStoreMutation.isPending}
                    className="border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {stores?.length === 0 && !isLoading && (
            <div className="col-span-full">
              <Card className="group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 bg-white dark:bg-gray-900 ring-1 ring-gray-200/50 dark:ring-gray-800/50">
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-400/20 to-teal-600/20 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-500"></div>

                <CardContent className="relative z-10 text-center py-16">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Store className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    No stores found
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
                    Get started by creating your first store to organize your products
                  </p>
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-700 hover:to-indigo-600"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Create Store
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
