import React, { useState, useEffect } from 'react';
import { useKeycloak } from '@react-keycloak/web';
import { Plus, Edit, Trash2, Package, ShoppingBag, TrendingUp, Mail, MailCheck } from 'lucide-react';

interface Product {
  id?: number;
  title: string;
  description: string;
  imageUrl: string;
  stock: number;
  price: number;
}

interface ProductOrder {
  id: number;
  productId: number;
  productTitle: string;
  username: string;
  quantity: number;
  orderedAt: string;
  totalPrice: number;
}

const Products: React.FC = () => {
  const { keycloak } = useKeycloak();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<ProductOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mailEnabled, setMailEnabled] = useState(false);
  const [mailToggleSaving, setMailToggleSaving] = useState(false);
  const [formData, setFormData] = useState<Product>({
    title: '',
    description: '',
    imageUrl: '',
    stock: 0,
    price: 0
  });

  const apiUrl = import.meta.env.VITE_API_Q_URL || 'http://localhost:8080/';

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${keycloak.token}`,
        'Content-Type': 'application/json'
      };

      const [productsRes, ordersRes, settingsRes] = await Promise.all([
        fetch(`${apiUrl}api/v2/shop/products`, { headers }),
        fetch(`${apiUrl}api/v2/shop/admin/orders`, { headers }),
        fetch(`${apiUrl}api/v2/shop/settings`, { headers }),
      ]);

      if (productsRes.ok) setProducts(await productsRes.json());
      if (ordersRes.ok) setOrders(await ordersRes.json());
      if (settingsRes.ok) {
        const s = await settingsRes.json();
        setMailEnabled(s.mailEnabled);
      }
    } catch (error) {
      console.error('Error fetching shop data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMailToggle = async (value: boolean) => {
    setMailToggleSaving(true);
    try {
      const res = await fetch(`${apiUrl}api/v2/shop/settings?mailEnabled=${value}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${keycloak.token}` }
      });
      if (res.ok) setMailEnabled(value);
    } catch (error) {
      console.error('Error saving mail setting:', error);
    } finally {
      setMailToggleSaving(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [keycloak.token]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiUrl}api/v2/shop/admin/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${keycloak.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setIsModalOpen(false);
        fetchData();
        setFormData({ title: '', description: '', imageUrl: '', stock: 0, price: 0 });
        setEditingProduct(null);
      }
    } catch (error) {
      console.error('Error saving product:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Produkt wirklich löschen?')) return;
    try {
      const response = await fetch(`${apiUrl}api/v2/shop/admin/products/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${keycloak.token}`
        }
      });
      if (response.ok) fetchData();
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData(product);
    setIsModalOpen(true);
  };

  const getSalesCount = (productId: number) => {
    return orders
      .filter(o => o.productId === productId)
      .reduce((sum, o) => sum + o.quantity, 0);
  };

  const getTotalRevenue = () => {
    return orders.reduce((sum, o) => sum + o.totalPrice, 0);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Shop-Verwaltung</h1>
          <p className="text-muted-foreground">Verwalten Sie Produkte und sehen Sie Verkaufsstatistiken.</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({ title: '', description: '', imageUrl: '', stock: 0, price: 0 });
            setIsModalOpen(true);
          }}
          className="bg-primary text-primary px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90 transition-opacity"
        >
          <Plus size={18} /> Produkt hinzufügen
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border rounded-lg p-6 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full dark:bg-blue-900 dark:text-blue-300">
            <Package size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Aktive Produkte</p>
            <p className="text-2xl font-bold">{products.length}</p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-6 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-full dark:bg-green-900 dark:text-green-300">
            <ShoppingBag size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Verkaufte Einheiten</p>
            <p className="text-2xl font-bold">{orders.reduce((sum, o) => sum + o.quantity, 0)}</p>
          </div>
        </div>
        <div className="bg-card border rounded-lg p-6 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-full dark:bg-purple-900 dark:text-purple-300">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Gesamtumsatz</p>
            <p className="text-2xl font-bold">{getTotalRevenue().toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })}</p>
          </div>
        </div>
      </div>

      {/* Mail Settings */}
      <div className="bg-card border rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-1">E-Mail-Einstellungen</h2>
        <p className="text-muted-foreground text-sm mb-5">Steuert, ob Kunden nach einer Bestellung oder einem Ticket-Upgrade eine Bestätigungs-E-Mail erhalten.</p>
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/30">
          <div className="flex items-center gap-3">
            {mailEnabled ? (
              <MailCheck className="text-green-600 dark:text-green-400" size={22} />
            ) : (
              <Mail className="text-muted-foreground" size={22} />
            )}
            <div>
              <p className="font-medium">Bestätigungs-E-Mails nach Shop-Bestellungen</p>
              <p className="text-xs text-muted-foreground">
                {mailEnabled ? 'Kunden erhalten eine E-Mail nach jeder Bestellung / jedem Upgrade.' : 'Derzeit deaktiviert — Kunden erhalten keine E-Mail.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => handleMailToggle(!mailEnabled)}
            disabled={mailToggleSaving}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none disabled:opacity-50 ${mailEnabled ? 'bg-green-500' : 'bg-muted-foreground/40'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${mailEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      <div className="bg-card border rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-semibold">Produkte</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-muted/50 text-muted-foreground text-sm uppercase">
              <tr>
                <th className="px-6 py-3">Produkt</th>
                <th className="px-6 py-3">Preis</th>
                <th className="px-6 py-3">Lagerbestand</th>
                <th className="px-6 py-3">Verkauft</th>
                <th className="px-6 py-3 text-right">Aktionen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.imageUrl && (
                        <img src={product.imageUrl} alt={product.title} className="w-10 h-10 object-cover rounded shadow-sm" />
                      )}
                      <div>
                        <div className="font-medium">{product.title}</div>
                        <div className="text-xs text-muted-foreground line-clamp-1">{product.description}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono">
                    {product.price.toLocaleString('de-AT', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${product.stock < 10 ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300' : 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'}`}>
                      {product.stock} Stück
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {getSalesCount(product.id!)}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button onClick={() => openEdit(product)} className="p-2 hover:bg-muted rounded transition-colors text-blue-600">
                      <Edit size={16} />
                    </button>
                    <button onClick={() => handleDelete(product.id!)} className="p-2 hover:bg-muted rounded transition-colors text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card border rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-bold">{editingProduct ? 'Produkt bearbeiten' : 'Neues Produkt'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">&times;</button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Titel</label>
                <input 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full p-2 rounded-md border bg-card"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Beschreibung</label>
                <textarea 
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full p-2 rounded-md border bg-card h-24"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Preis (€)</label>
                  <input 
                    type="number" step="0.01" required
                    value={formData.price}
                    onChange={e => setFormData({...formData, price: parseFloat(e.target.value)})}
                    className="w-full p-2 rounded-md border bg-card"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Lagerbestand</label>
                  <input 
                    type="number" required
                    value={formData.stock}
                    onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})}
                    className="w-full p-2 rounded-md border bg-card"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Produktbild</label>
                <div className="flex items-center gap-4">
                  {formData.imageUrl && (
                    <img src={formData.imageUrl} alt="Preview" className="w-16 h-16 object-cover rounded border" />
                  )}
                  <input 
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full p-2 rounded-md border bg-card text-sm"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-md hover:bg-muted">Abbrechen</button>
                <button type="submit" className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90">Speichern</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;
