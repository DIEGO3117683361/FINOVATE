
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { User, FinancialItem, Payment, ItemType, AppView, ModalType, Reminder, BankAccount, InvoiceDetails } from './types';
import { generateReceiptPDF, generateLoanStatementPDF, generateInvoicePDF } from './services/pdfService';
import { PlusIcon, DocumentDuplicateIcon, ArrowLeftIcon, XMarkIcon, SunIcon, MoonIcon, BellIcon, CalendarDaysIcon, ChartBarIcon, CheckCircleIcon, TrashIcon, BanknotesIcon, DocumentChartBarIcon, UserCircleIcon, ChevronDownIcon, BuildingLibraryIcon, PencilIcon, Cog6ToothIcon, QrCodeIcon, CameraIcon, EyeIcon, ArrowDownTrayIcon, ShareIcon, ArrowUpTrayIcon } from './components/Icons';

// --- UI Helper Components (Redesigned) ---

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  containerClassName?: string;
}
const Input: React.FC<InputProps> = ({ label, id, containerClassName, ...props }) => (
  <div className={containerClassName}>
    <label htmlFor={id} className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">{label}</label>
    <input
      id={id}
      {...props}
      className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-blue-500 transition-all duration-200"
    />
  </div>
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  children: React.ReactNode;
  className?: string;
}
const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', className, ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-0.5";
  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500',
    secondary: 'bg-zinc-200 text-zinc-900 hover:bg-zinc-300/70 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 focus:ring-zinc-500',
    danger: 'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500',
    ghost: 'bg-transparent text-zinc-600 hover:bg-zinc-200/60 dark:text-zinc-400 dark:hover:bg-zinc-800 shadow-none hover:transform-none'
  };
  return (
    <button className={`${baseClasses} ${variantClasses[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};


interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}
const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300 animate-fade-in" onClick={onClose}>
      <div 
        className="relative bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-300 animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
          <button onClick={onClose} className="p-1 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// --- Main Application Component ---
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<FinancialItem[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [view, setView] = useState<AppView>('login');
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [modal, setModal] = useState<ModalType>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loginError, setLoginError] = useState<string>('');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<{
    isOpen: boolean;
    title: string;
    message: React.ReactNode;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });
  
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const storedTheme = localStorage.getItem('finovate_theme');
    if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;
    return 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('finovate_theme', theme);
  }, [theme]);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('finovate_user');
      const storedItems = localStorage.getItem('finovate_items');
      const storedReminders = localStorage.getItem('finovate_reminders');
      const storedAccounts = localStorage.getItem('finovate_accounts');
      
      if (storedUser) { setUser(JSON.parse(storedUser)); setView('login'); } 
      else { setView('register'); }

      if (storedItems) { setItems(JSON.parse(storedItems)); }
      if (storedReminders) { setReminders(JSON.parse(storedReminders)); }
      if (storedAccounts) { setBankAccounts(JSON.parse(storedAccounts)); }
      
    } catch (error) {
      console.error("Fallo al cargar datos de localStorage", error);
      setView('register');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const saveData = useCallback((newUser: User | null, newItems: FinancialItem[], newReminders: Reminder[], newAccounts: BankAccount[]) => {
    try {
        if (newUser) localStorage.setItem('finovate_user', JSON.stringify(newUser));
        localStorage.setItem('finovate_items', JSON.stringify(newItems));
        localStorage.setItem('finovate_reminders', JSON.stringify(newReminders));
        localStorage.setItem('finovate_accounts', JSON.stringify(newAccounts));
    } catch (error) {
        console.error("Fallo al guardar datos en localStorage", error);
    }
  }, []);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleRegister = (newUser: Omit<User, 'id' | 'passwordHash'>, password: string) => {
    const userWithId: User = { ...newUser, id: crypto.randomUUID(), passwordHash: password };
    setUser(userWithId);
    setIsLoggedIn(true);
    setView('dashboard');
    saveData(userWithId, [], [], []);
  };

  const handleLogin = (password: string) => {
    if (user && password === user.passwordHash) {
      setIsLoggedIn(true);
      setView('dashboard');
      setLoginError('');
    } else {
      setLoginError('Contraseña incorrecta. Por favor, intente de nuevo.');
    }
  };

  const handleResetPassword = (newPassword: string) => {
    if(user){
      const updatedUser = { ...user, passwordHash: newPassword };
      setUser(updatedUser);
      saveData(updatedUser, items, reminders, bankAccounts);
      setView('login');
    }
  };

  const handleUpdateUser = (updatedUserData: Partial<User>) => {
    if(user) {
        const updatedUser = { ...user, ...updatedUserData };
        setUser(updatedUser);
        saveData(updatedUser, items, reminders, bankAccounts);
    }
  };

  const handleLogout = () => { setIsLoggedIn(false); setView('login'); };

  const handleAddItem = (itemData: Omit<FinancialItem, 'id' | 'payments'>) => {
    const newItem: FinancialItem = { ...itemData, id: crypto.randomUUID(), payments: [] };
    const newItems = [...items, newItem];
    setItems(newItems);
    saveData(user, newItems, reminders, bankAccounts);
    setModal(null);
  };
  
  const handleDeleteItem = (itemId: string) => {
    setConfirmation({
        isOpen: true,
        title: 'Confirmar Eliminación',
        message: '¿Estás seguro de que quieres eliminar este registro? Esta acción es irreversible.',
        onConfirm: () => {
            const newItems = items.filter(item => item.id !== itemId);
            setItems(newItems);
            saveData(user, newItems, reminders, bankAccounts);
            if (view === 'detail') {
                setView('dashboard');
            }
            setConfirmation({ ...confirmation, isOpen: false });
        }
    });
  };

  const handleAddPayment = (itemId: string, paymentData: Omit<Payment, 'id' | 'receiptGenerated'>) => {
    const newPayment: Payment = {...paymentData, id: crypto.randomUUID(), receiptGenerated: false};
    const newItems = items.map(item => item.id === itemId ? {...item, payments: [...item.payments, newPayment]} : item);
    setItems(newItems);
    saveData(user, newItems, reminders, bankAccounts);
    setModal(null);
  };
  
  const handleGenerateReceipt = (item: FinancialItem, payment: Payment, outputType: 'download' | 'view') => {
      if(user) {
        if (outputType === 'view') {
          const dataUrl = generateReceiptPDF(user, item, payment, 'dataurl');
          if (dataUrl && typeof dataUrl === 'string') {
            setPdfPreviewUrl(dataUrl);
          }
        } else {
          generateReceiptPDF(user, item, payment, 'download');
        }
        const newItems = items.map(i => i.id === item.id ? {...i, payments: i.payments.map(p => p.id === payment.id ? {...p, receiptGenerated: true} : p)} : i);
        setItems(newItems);
        saveData(user, newItems, reminders, bankAccounts);
      }
  };
  
  const handleGenerateStatement = (item: FinancialItem, outputType: 'download' | 'view') => {
      if(user && item.type === ItemType.LOAN) {
        if (outputType === 'view') {
          const dataUrl = generateLoanStatementPDF(user, item, 'dataurl');
          if (dataUrl && typeof dataUrl === 'string') {
            setPdfPreviewUrl(dataUrl);
          }
        } else {
          generateLoanStatementPDF(user, item, 'download');
        }
      }
  };

  const handleGenerateInvoice = (item: FinancialItem, invoiceDetails: InvoiceDetails, outputType: 'download' | 'view') => {
    if (!user) return;
    
    const paymentInfo = bankAccounts.map(acc => `Banco: ${acc.bankName}, Cuenta: ${acc.accountName}`).join('; ');
    const qrText = `Pagar a: ${user.name}\nConcepto: ${invoiceDetails.concept}\nMonto: $${invoiceDetails.amount.toFixed(2)}\n${paymentInfo}`;

    window.QRCode.toDataURL(qrText, { width: 256 }, (err: any, qrUrl: string) => {
      const serviceOutputType = outputType === 'view' ? 'dataurl' : 'download';
      let pdfData: string | void;

      if (err) {
        console.error('Error al generar QR:', err);
        pdfData = generateInvoicePDF(user, item, invoiceDetails, bankAccounts, undefined, serviceOutputType);
      } else {
        pdfData = generateInvoicePDF(user, item, invoiceDetails, bankAccounts, qrUrl, serviceOutputType);
      }
      
      if (outputType === 'view' && typeof pdfData === 'string') {
        setPdfPreviewUrl(pdfData);
      }

      setModal(null);
    });
  };

  const handleAddReminder = (reminderData: Omit<Reminder, 'id' | 'completed'>) => {
    const newReminder: Reminder = { ...reminderData, id: crypto.randomUUID(), completed: false };
    const newReminders = [...reminders, newReminder].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setReminders(newReminders);
    saveData(user, items, newReminders, bankAccounts);
    setModal(null);
  };

  const handleToggleReminder = (reminderId: string) => {
      const newReminders = reminders.map(r => r.id === reminderId ? { ...r, completed: !r.completed } : r);
      setReminders(newReminders);
      saveData(user, items, newReminders, bankAccounts);
  };

  const handleDeleteReminder = (reminderId: string) => {
      setConfirmation({
        isOpen: true,
        title: 'Confirmar Eliminación',
        message: '¿Estás seguro de que quieres eliminar este recordatorio?',
        onConfirm: () => {
            const newReminders = reminders.filter(r => r.id !== reminderId);
            setReminders(newReminders);
            saveData(user, items, newReminders, bankAccounts);
            setConfirmation({ ...confirmation, isOpen: false });
        }
      });
  };

  const handleAddAccount = (accountData: Omit<BankAccount, 'id'>) => {
    const newAccount: BankAccount = { ...accountData, id: crypto.randomUUID() };
    const newAccounts = [...bankAccounts, newAccount];
    setBankAccounts(newAccounts);
    saveData(user, items, reminders, newAccounts);
    setModal(null);
  };

  const handleDeleteAccount = (accountId: string) => {
    setConfirmation({
        isOpen: true,
        title: 'Confirmar Eliminación de Cuenta',
        message: '¿Estás seguro de que quieres eliminar esta cuenta bancaria? Esta acción no se puede deshacer.',
        onConfirm: () => {
          const newAccounts = bankAccounts.filter(acc => acc.id !== accountId);
          setBankAccounts(newAccounts);
          saveData(user, items, reminders, newAccounts);
          setConfirmation({ ...confirmation, isOpen: false });
        }
    });
  };
  
  const handleExportAllData = () => {
    try {
        const dataToExport = { user, items, reminders, bankAccounts, dataType: 'finovate-full-backup', version: '1.0' };
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        const date = new Date().toISOString().split('T')[0];
        link.download = `finovate-backup-${date}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
    } catch (error) {
        console.error("Error exporting data:", error);
        alert("Hubo un error al exportar los datos.");
    }
  };

  const handleExportItem = (itemId: string) => {
    const itemToExport = items.find(i => i.id === itemId);
    if (!itemToExport) return;
    try {
        const dataToExport = { dataType: 'finovate-single-item', version: '1.0', item: itemToExport };
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const href = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = href;
        link.download = `finovate-item-${itemToExport.personName.replace(/\s/g, '_')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(href);
    } catch (error) {
        console.error("Error exporting item:", error);
        alert("Hubo un error al exportar el registro.");
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const result = event.target?.result;
            if (typeof result !== 'string') throw new Error("File could not be read as text");
            const importedData = JSON.parse(result);

            if (!importedData.dataType || !['finovate-full-backup', 'finovate-single-item'].includes(importedData.dataType)) {
                throw new Error("Archivo no válido o formato desconocido.");
            }
            
            if (importedData.dataType === 'finovate-full-backup') {
                setConfirmation({
                    isOpen: true,
                    title: 'Importar Respaldo Completo',
                    message: 'Vas a fusionar los datos de un archivo de respaldo. Los registros existentes no se modificarán, pero se agregarán nuevos registros del archivo. ¿Continuar?',
                    onConfirm: () => {
                        const newItems = [...items];
                        const existingItemIds = new Set(items.map(i => i.id));
                        (importedData.items || []).forEach((item: FinancialItem) => { if (!existingItemIds.has(item.id)) newItems.push(item); });

                        const newReminders = [...reminders];
                        const existingReminderIds = new Set(reminders.map(r => r.id));
                        (importedData.reminders || []).forEach((reminder: Reminder) => { if (!existingReminderIds.has(reminder.id)) newReminders.push(reminder); });
                        
                        const newAccounts = [...bankAccounts];
                        const existingAccountIds = new Set(bankAccounts.map(a => a.id));
                        (importedData.bankAccounts || []).forEach((account: BankAccount) => { if (!existingAccountIds.has(account.id)) newAccounts.push(account); });
                        
                        setItems(newItems);
                        setReminders(newReminders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()));
                        setBankAccounts(newAccounts);
                        saveData(user, newItems, newReminders, newAccounts);
                        alert("Datos importados y fusionados con éxito.");
                        setConfirmation({ ...confirmation, isOpen: false });
                    }
                });

            } else if (importedData.dataType === 'finovate-single-item') {
                const itemToImport = importedData.item as FinancialItem;
                if (!itemToImport || !itemToImport.id) throw new Error("El archivo de registro único no es válido.");

                if (items.some(i => i.id === itemToImport.id)) {
                    alert("Ya existe un registro con el mismo ID. No se puede importar.");
                    return;
                }
                
                setConfirmation({
                    isOpen: true,
                    title: 'Importar Registro Individual',
                    message: `Vas a importar el registro "${itemToImport.description}" para "${itemToImport.personName}". ¿Continuar?`,
                    onConfirm: () => {
                        const newItems = [...items, itemToImport];
                        setItems(newItems);
                        saveData(user, newItems, reminders, bankAccounts);
                        alert("Registro importado con éxito.");
                        setConfirmation({ ...confirmation, isOpen: false });
                    }
                });
            }
        } catch (error) {
            console.error("Error importing data:", error);
            alert(`Hubo un error al importar el archivo: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            e.target.value = '';
        }
    };
    reader.readAsText(file);
  };


  const activeItem = useMemo(() => items.find(item => item.id === activeItemId), [items, activeItemId]);

  const { totalAssets, totalLiabilities, netWorth, totalSavings } = useMemo(() => {
    const loansReceivable = items.filter(i => i.type === ItemType.LOAN).reduce((sum, i) => sum + (i.principal || 0), 0);
    const otherAssets = items.filter(i => i.type === ItemType.RENTAL || i.type === ItemType.OTHER).reduce((sum, i) => sum + (i.principal || i.monthlyAmount || 0), 0);
    const totalSavings = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0);
    const totalAssets = loansReceivable + otherAssets + totalSavings;
    const totalLiabilities = items.filter(i => i.type === ItemType.DEBT).reduce((sum, i) => sum + (i.principal || 0), 0);
    const netWorth = totalAssets - totalLiabilities;
    return { totalAssets, totalLiabilities, netWorth, totalSavings };
  }, [items, bankAccounts]);
  
  // --- UI Sub-components ---
  
  const RegistrationForm: React.FC = () => {
    const [formData, setFormData] = useState({ name: '', age: '', address: '', phone: '', email: '', occupation: '' });
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if(password !== confirmPassword) { alert("Las contraseñas no coinciden."); return; }
      if(Object.values(formData).some(v => !v) || !password) { alert("Por favor, complete todos los campos."); return; }
      handleRegister({ ...formData, age: parseInt(formData.age, 10) }, password);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, [e.target.name]: e.target.value});

    return (
      <div className="max-w-md mx-auto mt-10 p-4">
        <h1 className="text-4xl font-bold text-center mb-2">Bienvenido a Finovate</h1>
        <p className="text-center text-zinc-600 dark:text-zinc-400 mb-8">Crea tu cuenta para empezar a organizar tus finanzas.</p>
        <form onSubmit={handleSubmit} className="space-y-4 p-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <Input label="Nombre Completo" name="name" id="name" type="text" onChange={handleChange} required />
            <div className="grid grid-cols-2 gap-4">
                <Input label="Edad" name="age" id="age" type="number" onChange={handleChange} required />
                <Input label="Oficio" name="occupation" id="occupation" type="text" onChange={handleChange} required />
            </div>
            <Input label="Dirección" name="address" id="address" type="text" onChange={handleChange} required />
            <Input label="Número de Teléfono" name="phone" id="phone" type="tel" onChange={handleChange} required />
            <Input label="Correo Electrónico" name="email" id="email" type="email" onChange={handleChange} required />
            <hr className="border-zinc-300 dark:border-zinc-700"/>
            <Input label="Contraseña" name="password" id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            <Input label="Confirmar Contraseña" name="confirmPassword" id="confirmPassword" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
            <div className="pt-4">
                <Button type="submit" className="w-full">Crear Cuenta</Button>
            </div>
        </form>
      </div>
    );
  };
  
  const LoginForm: React.FC = () => {
    const [password, setPassword] = useState('');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); handleLogin(password); };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-zinc-100 dark:bg-zinc-950">
             <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    {user?.profilePicture ? 
                        <img src={user.profilePicture} alt="Profile" className="w-24 h-24 mx-auto rounded-full object-cover border-4 border-zinc-200 dark:border-zinc-700 shadow-lg" />
                        : <UserCircleIcon className="w-24 h-24 mx-auto text-zinc-400 dark:text-zinc-600"/>
                    }
                    <h1 className="text-4xl font-bold mt-4">Bienvenido de nuevo,</h1>
                    <h2 className="text-3xl font-semibold text-blue-600 dark:text-blue-400">{user?.name.split(' ')[0]}</h2>
                    <p className="text-zinc-500 dark:text-zinc-400 mt-2">Tu centro de mando financiero te espera.</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6 p-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
                    <Input label="Contraseña" id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} required autoFocus />
                    {loginError && <p className="text-sm text-red-500 text-center animate-shake">{loginError}</p>}
                    <Button type="submit" className="w-full">Desbloquear</Button>
                    <div className="text-center">
                        <button type="button" onClick={() => setView('forgot-password')} className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                            ¿Olvidaste tu contraseña?
                        </button>
                    </div>
                </form>
                 
                <button 
                  onClick={() => setConfirmation({
                      isOpen: true,
                      title: 'Borrar Todos los Datos',
                      message: `¿No eres ${user?.name}? Esta acción borrará todos tus datos de forma permanente. ¿Estás seguro de que quieres empezar de nuevo?`,
                      onConfirm: () => {
                          localStorage.clear();
                          window.location.reload();
                      }
                  })} 
                  className="text-center w-full mt-8 text-xs text-zinc-500 hover:text-red-500 transition-colors"
                >
                  ¿No eres {user?.name}? Borrar datos y empezar de nuevo.
                </button>
            </div>
        </div>
    );
  };
  
  const ForgotPasswordView: React.FC = () => {
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState('');
    const [emailVerified, setEmailVerified] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const handleEmailSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(user && user.email === email) {
            setEmailVerified(true);
            setEmailError('');
        } else {
            setEmailError('El correo electrónico no coincide con el registrado.');
        }
    };
    
    const handlePasswordSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword.length < 4) {
             setPasswordError('La contraseña debe tener al menos 4 caracteres.');
             return;
        }
        if (newPassword !== confirmPassword) {
            setPasswordError('Las contraseñas no coinciden.');
            return;
        }
        setPasswordError('');
        handleResetPassword(newPassword);
        alert('¡Contraseña actualizada con éxito!');
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4">
             <div className="w-full max-w-md">
                {!emailVerified ? (
                    <>
                        <h1 className="text-3xl font-bold text-center mb-2">Recuperar Contraseña</h1>
                        <p className="text-center text-zinc-600 dark:text-zinc-400 mb-8">Ingresa tu correo electrónico para verificar tu identidad.</p>
                        <form onSubmit={handleEmailSubmit} className="space-y-4 p-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
                             <Input label="Correo Electrónico" id="email-recovery" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                             {emailError && <p className="text-sm text-red-500 text-center animate-shake">{emailError}</p>}
                             <div className="pt-2 flex gap-4">
                                <Button onClick={() => setView('login')} variant="secondary" type="button" className="w-full">Volver</Button>
                                <Button type="submit" className="w-full">Verificar</Button>
                             </div>
                        </form>
                    </>
                ) : (
                     <>
                        <h1 className="text-3xl font-bold text-center mb-2">Crear Nueva Contraseña</h1>
                        <p className="text-center text-zinc-600 dark:text-zinc-400 mb-8">Identidad verificada. Ahora puedes crear una nueva contraseña.</p>
                        <form onSubmit={handlePasswordSubmit} className="space-y-4 p-8 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800">
                            <Input label="Nueva Contraseña" id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
                            <Input label="Confirmar Nueva Contraseña" id="confirm-new-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
                             {passwordError && <p className="text-sm text-red-500 text-center animate-shake">{passwordError}</p>}
                            <div className="pt-2">
                                <Button type="submit" className="w-full">Guardar Contraseña</Button>
                            </div>
                        </form>
                    </>
                )}
             </div>
        </div>
    );
  };

  const Header: React.FC = () => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    return (
        <header className="flex justify-between items-center p-4 border-b border-zinc-200/80 dark:border-zinc-800/80 sticky top-0 bg-zinc-100/50 dark:bg-zinc-950/50 backdrop-blur-lg z-40">
            <h1 className="text-2xl font-bold tracking-tighter">Finovate</h1>
            <div className="relative">
                <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center gap-2 p-1.5 rounded-full bg-zinc-200/50 dark:bg-zinc-800/50">
                    {user?.profilePicture ? 
                        <img src={user.profilePicture} alt="Profile" className="w-8 h-8 rounded-full object-cover"/> 
                        : <UserCircleIcon className="w-8 h-8 text-zinc-500 dark:text-zinc-400"/>
                    }
                    <span className="text-sm font-semibold hidden sm:block pr-1">{user?.name.split(' ')[0]}</span>
                    <ChevronDownIcon className={`w-4 h-4 text-zinc-500 transition-transform hidden sm:block ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-2xl z-50 animate-fade-in-fast" onMouseLeave={()=>setDropdownOpen(false)}>
                        <div className="p-2">
                            <button onClick={() => { setView('settings'); setDropdownOpen(false); }} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors">
                                <Cog6ToothIcon className="w-5 h-5"/> Ajustes de Cuenta
                            </button>
                             <button onClick={toggleTheme} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60 transition-colors">
                                {theme === 'light' ? <MoonIcon className="w-5 h-5"/> : <SunIcon className="w-5 h-5"/>}
                                Cambiar a Tema {theme === 'light' ? 'Oscuro' : 'Claro'}
                            </button>
                            <div className="h-px bg-zinc-200 dark:bg-zinc-700 my-1"></div>
                            <button onClick={handleLogout} className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-red-600 dark:text-red-400 rounded-md hover:bg-red-500/10 transition-colors">
                                Salir
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
  };

  const Dashboard: React.FC = () => {
    const stats = useMemo(() => {
        let totalLent = 0, totalDebt = 0, totalCollected = 0;
        items.forEach(item => {
            if (item.type === ItemType.LOAN) totalLent += item.principal || 0;
            if (item.type === ItemType.DEBT) totalDebt += item.principal || 0;
            if (item.type !== ItemType.DEBT) {
                 item.payments.forEach(p => totalCollected += p.amount);
            }
        });
        return { totalLent, totalDebt, totalCollected };
    }, [items]);
    
    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total en Ahorros" value={`$${totalSavings.toFixed(2)}`} icon={<BuildingLibraryIcon className="w-7 h-7"/>} className="text-blue-600 dark:text-blue-500" />
                <StatCard label="Total Prestado" value={`$${stats.totalLent.toFixed(2)}`} icon={<BanknotesIcon className="w-7 h-7"/>} className="text-green-600 dark:text-green-500" />
                <StatCard label="Total Deudas" value={`$${stats.totalDebt.toFixed(2)}`} icon={<BanknotesIcon className="w-7 h-7"/>} className="text-red-600 dark:text-red-500" />
                <StatCard label="Total Recaudado" value={`$${stats.totalCollected.toFixed(2)}`} icon={<CheckCircleIcon className="w-7 h-7"/>} className="text-green-600 dark:text-green-500" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <UpcomingEvents items={items} />
                <Reminders reminders={reminders} onAdd={() => setModal('add-reminder')} onToggle={handleToggleReminder} onDelete={handleDeleteReminder}/>
            </div>

            <div>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Mis Registros</h2>
                    <div className="flex items-center gap-2">
                         <Button onClick={() => setView('financial-summary')} variant="secondary"><ChartBarIcon className="w-4 h-4 mr-2" /> Resumen Financiero</Button>
                         <Button onClick={() => setModal('add-item')}><PlusIcon className="w-4 h-4 mr-2" /> Agregar Registro</Button>
                    </div>
                </div>
                <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {items.length > 0 ? items.map(item => (
                            <li key={item.id} className="group p-4 hover:bg-zinc-200/30 dark:hover:bg-zinc-800/50 flex justify-between items-center transition-colors">
                                <div onClick={() => { setActiveItemId(item.id); setView('detail'); }} className="flex-grow cursor-pointer">
                                    <p className="font-semibold">{item.personName}</p>
                                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.type} - {item.description}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="text-right hidden sm:block" onClick={() => { setActiveItemId(item.id); setView('detail'); }}>
                                        <p className={`font-semibold ${item.type === ItemType.DEBT ? 'text-red-500' : 'text-green-500'}`}>${(item.principal || item.monthlyAmount || 0).toFixed(2)}</p>
                                        <p className="text-sm text-zinc-500 dark:text-zinc-400">{item.payments.length} Pagos</p>
                                    </div>
                                    <Button variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }} title="Eliminar Registro" className="!p-1.5 aspect-square !rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <TrashIcon className="w-5 h-5 text-red-500" />
                                    </Button>
                                </div>
                            </li>
                        )) : <p className="p-8 text-center text-zinc-500 dark:text-zinc-400">No hay registros. Agrega uno para empezar.</p>}
                    </ul>
                </div>
            </div>
        </div>
    );
  };
  
  const StatCard: React.FC<{label:string, value:string|number, icon: React.ReactNode, className?:string}> = ({label, value, icon, className}) => (
      <div className="p-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl flex items-center gap-4">
          <div className="p-3 bg-blue-100/50 dark:bg-blue-900/50 rounded-full text-blue-600 dark:text-blue-400">{icon}</div>
          <div>
            <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">{label}</h3>
            <p className={`text-2xl font-bold text-zinc-900 dark:text-zinc-100 mt-1 ${className}`}>{value}</p>
          </div>
      </div>
  );

  const UpcomingEvents: React.FC<{ items: FinancialItem[] }> = ({ items }) => {
    const upcoming = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return items.map(item => {
            let nextDueDate: Date | null = null;
            let amountDue = item.monthlyAmount || 0;
            let eventType: 'cobro' | 'pago' = 'cobro';

            if (item.type === ItemType.RENTAL && item.paymentDay) {
                let nextDate = new Date(today.getFullYear(), today.getMonth(), item.paymentDay);
                if (nextDate < today) nextDate.setMonth(nextDate.getMonth() + 1);
                nextDueDate = nextDate;
            } else if (item.type === ItemType.LOAN && item.startDate) {
                let nextDate = new Date(item.startDate);
                while(nextDate < today) nextDate.setMonth(nextDate.getMonth() + 1);
                nextDueDate = nextDate;
            } else if (item.type === ItemType.DEBT && item.dueDate) {
                nextDueDate = new Date(item.dueDate);
                amountDue = item.principal || 0;
                eventType = 'pago';
            }
            
            if (!nextDueDate || nextDueDate < today) return null;
            const diffDays = Math.ceil((nextDueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) return { id: item.id, personName: item.personName, dueDate: nextDueDate, amount: amountDue, daysUntilDue: diffDays, eventType };
            return null;
        }).filter((i): i is NonNullable<typeof i> => i !== null).sort((a,b) => a.dueDate.getTime() - b.dueDate.getTime());
    }, [items]);
    
    return (
        <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><CalendarDaysIcon className="w-6 h-6" /> Próximos Eventos (30 días)</h3>
            <ul className="space-y-3">
                {upcoming.length > 0 ? upcoming.map(p => (
                    <li key={p.id} className="flex justify-between items-center text-sm">
                        <div>
                            <p className="font-semibold">{p.personName}</p>
                            <p className="text-zinc-500 dark:text-zinc-400">{p.dueDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })} - <span className={p.eventType === 'pago' ? 'text-red-500' : 'text-green-500'}>{p.eventType === 'pago' ? 'Pago' : 'Cobro'}</span></p>
                        </div>
                        <div className="text-right">
                           {p.amount > 0 && <p className="font-semibold">${p.amount.toFixed(2)}</p>}
                           <p className={`px-2 py-0.5 rounded-full text-xs ${p.daysUntilDue <= 7 ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'}`}>
                            Vence en {p.daysUntilDue} días
                           </p>
                        </div>
                    </li>
                )) : <p className="text-center text-zinc-500 dark:text-zinc-400 pt-4">No hay eventos próximos.</p>}
            </ul>
        </div>
    );
  };
  
  const Reminders: React.FC<{reminders: Reminder[], onAdd: () => void, onToggle: (id: string) => void, onDelete: (id: string) => void}> = ({reminders, onAdd, onToggle, onDelete}) => (
      <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2"><BellIcon className="w-6 h-6" /> Recordatorios</h3>
            <Button onClick={onAdd} variant="ghost" className="!p-1.5 aspect-square !rounded-full"><PlusIcon className="w-5 h-5"/></Button>
          </div>
          <ul className="space-y-2">
            {reminders.length > 0 ? reminders.map(r => (
                <li key={r.id} className={`flex items-center gap-2 group ${r.completed ? 'opacity-50' : ''}`}>
                    <button onClick={() => onToggle(r.id)} className="p-1">
                        <CheckCircleIcon className={`w-6 h-6 transition-colors ${r.completed ? 'text-green-500' : 'text-zinc-300 dark:text-zinc-600'}`} />
                    </button>
                    <div className="flex-grow">
                        <p className={`text-sm font-medium ${r.completed ? 'line-through' : ''}`}>{r.text}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400">{new Date(r.date).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                    </div>
                    <Button onClick={() => onDelete(r.id)} variant="ghost" className="!p-1.5 aspect-square !rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                        <TrashIcon className="w-5 h-5 text-red-500" />
                    </Button>
                </li>
            )) : <p className="text-center text-zinc-500 dark:text-zinc-400 pt-4">No tienes recordatorios.</p>}
          </ul>
      </div>
  );

  const ItemDetailView: React.FC = () => {
    if(!activeItem) return null;
    const capitalPaid = activeItem.payments.filter(p => p.allocation === 'capital' || activeItem.type === ItemType.DEBT).reduce((sum, p) => sum + p.amount, 0);
    const totalPaid = activeItem.payments.reduce((sum, p) => sum + p.amount, 0);
    const balance = (activeItem.principal || 0) - capitalPaid;
    
    const typeColorClasses = {
        [ItemType.LOAN]: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        [ItemType.RENTAL]: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        [ItemType.DEBT]: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        [ItemType.OTHER]: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <button onClick={() => setView('dashboard')} className="mb-6 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                <ArrowLeftIcon className="w-5 h-5" /> Volver al Dashboard
            </button>
            <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl p-6 mb-6">
                <div className="flex flex-wrap justify-between items-start gap-4">
                    <div>
                        <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${typeColorClasses[activeItem.type]}`}>{activeItem.type}</span>
                        <h2 className="text-3xl font-bold mt-2">{activeItem.personName}</h2>
                        <p className="text-zinc-500 dark:text-zinc-400">{activeItem.description}</p>
                        <div className="text-sm text-zinc-500 dark:text-zinc-400 mt-2 space-x-4">
                            {activeItem.personId && <span>ID: {activeItem.personId}</span>}
                            {activeItem.personPhone && <span>Tel: {activeItem.personPhone}</span>}
                        </div>
                    </div>
                     <div className="flex gap-2 flex-wrap justify-end">
                        <Button variant="secondary" onClick={() => setModal('generate-invoice')}><QrCodeIcon className="w-4 h-4 mr-2" /> Factura</Button>
                        {activeItem.type === ItemType.LOAN && <Button variant="secondary" onClick={() => handleGenerateStatement(activeItem, 'view')}><EyeIcon className="w-4 h-4 mr-2" /> Ver Estado</Button>}
                        {activeItem.type === ItemType.LOAN && <Button variant="secondary" onClick={() => handleGenerateStatement(activeItem, 'download')}><DocumentChartBarIcon className="w-4 h-4 mr-2" /> Descargar</Button>}
                        <Button onClick={() => setModal('add-payment')}><PlusIcon className="w-4 h-4 mr-2" /> Registrar Pago</Button>
                        <Button variant="secondary" onClick={() => handleExportItem(activeItem.id)}><ShareIcon className="w-4 h-4 mr-2" /> Exportar</Button>
                        <Button variant="danger" onClick={() => handleDeleteItem(activeItem.id)}><TrashIcon className="w-4 h-4 mr-2"/> Eliminar</Button>
                     </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 border-t border-zinc-200 dark:border-zinc-800 pt-6">
                    <div><p className="text-sm text-zinc-500">{activeItem.type === ItemType.LOAN ? 'Monto Principal' : activeItem.type === ItemType.DEBT ? 'Monto Adeudado' : 'Monto Mensual'}</p><p className="font-semibold text-lg">${(activeItem.principal || activeItem.monthlyAmount || 0).toFixed(2)}</p></div>
                    {activeItem.type === ItemType.LOAN && <div><p className="text-sm text-zinc-500">Interés</p><p className="font-semibold text-lg">{activeItem.interestRate || 0}%</p></div>}
                    <div><p className="text-sm text-zinc-500">{activeItem.type === ItemType.DEBT ? 'Total Pagado' : 'Total Recibido'}</p><p className="font-semibold text-lg text-green-600">${totalPaid.toFixed(2)}</p></div>
                    {(activeItem.type === ItemType.LOAN || activeItem.type === ItemType.DEBT) && <div><p className="text-sm text-zinc-500">{activeItem.type === ItemType.LOAN ? 'Saldo Capital' : 'Saldo Pendiente'}</p><p className="font-semibold text-lg text-red-600">${balance.toFixed(2)}</p></div>}
                </div>
            </div>

            <h3 className="text-xl font-bold mb-4">Historial de Pagos</h3>
            <div className="bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {activeItem.payments.length > 0 ? [...activeItem.payments].reverse().map(p => (
                        <li key={p.id} className="p-4 flex flex-wrap justify-between items-center gap-2">
                            <div>
                                <p className="font-semibold">${p.amount.toFixed(2)}</p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">{new Date(p.date).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })} - {p.method} {p.allocation && <span className="text-xs font-medium px-1.5 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 ml-2">{p.allocation}</span>}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" onClick={() => handleGenerateReceipt(activeItem, p, 'view')} title="Ver Recibo"><EyeIcon className="w-5 h-5"/></Button>
                                <Button variant="ghost" onClick={() => handleGenerateReceipt(activeItem, p, 'download')} title="Descargar Recibo"><ArrowDownTrayIcon className="w-5 h-5"/></Button>
                            </div>
                        </li>
                    )) : <p className="p-8 text-center text-zinc-500 dark:text-zinc-400">No se han registrado pagos.</p>}
                </ul>
            </div>
        </div>
    );
  };
  
  const FinancialSummaryView: React.FC = () => {
    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            <div>
                <button onClick={() => setView('dashboard')} className="mb-4 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    <ArrowLeftIcon className="w-5 h-5" /> Volver al Dashboard
                </button>
                <h1 className="text-3xl font-bold">Resumen Financiero</h1>
            </div>
            
            <div className="p-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl text-center">
                 <h3 className="text-sm font-medium text-zinc-500 dark:text-zinc-400">PATRIMONIO NETO</h3>
                 <p className={`text-5xl font-extrabold mt-2 ${netWorth >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-500'}`}>${netWorth.toFixed(2)}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                     <h2 className="text-2xl font-bold text-green-600 dark:text-green-500">Activos: ${totalAssets.toFixed(2)}</h2>
                     
                     {/* Bank Accounts Section */}
                     <div className="bg-white/30 dark:bg-zinc-900/30 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-4">
                         <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold">Cuentas Bancarias y Ahorros</h3>
                            <Button onClick={() => setModal('add-account')} variant="ghost" className="!p-1.5 aspect-square !rounded-full"><PlusIcon className="w-5 h-5"/></Button>
                         </div>
                         {bankAccounts.length > 0 ? (
                            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {bankAccounts.map(acc => (
                                    <li key={acc.id} className="py-2 flex justify-between items-center group">
                                      <div>
                                        <p className="font-semibold">{acc.bankName} <span className="font-normal text-zinc-500">({acc.accountName})</span></p>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <span className="font-semibold">${acc.balance.toFixed(2)}</span>
                                        <Button onClick={() => handleDeleteAccount(acc.id)} variant="ghost" className="!p-1 aspect-square !rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <TrashIcon className="w-4 h-4 text-red-500" />
                                        </Button>
                                      </div>
                                    </li>
                                ))}
                            </ul>
                         ) : <p className="text-sm text-zinc-500">No has agregado cuentas.</p>}
                     </div>

                     {Object.values(ItemType).filter(t => t !== ItemType.DEBT).map(type => {
                         const filteredItems = items.filter(i => i.type === type);
                         if (filteredItems.length === 0) return null;
                         return (
                            <div key={type} className="bg-white/30 dark:bg-zinc-900/30 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-4">
                                <h3 className="font-bold mb-2">{type}s</h3>
                                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                    {filteredItems.map(item => (
                                        <li key={item.id} className="py-2 flex justify-between">
                                            <span>{item.personName}</span>
                                            <span className="font-semibold">${(item.principal || item.monthlyAmount || 0).toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                         )
                     })}
                </div>
                 <div className="space-y-4">
                     <h2 className="text-2xl font-bold text-red-600 dark:text-red-500">Pasivos: ${totalLiabilities.toFixed(2)}</h2>
                     <div className="bg-white/30 dark:bg-zinc-900/30 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-lg p-4">
                        <h3 className="font-bold mb-2">Deudas</h3>
                        {items.filter(i => i.type === ItemType.DEBT).length > 0 ? (
                            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                                {items.filter(i => i.type === ItemType.DEBT).map(item => (
                                    <li key={item.id} className="py-2 flex justify-between">
                                        <span>{item.personName}</span>
                                        <span className="font-semibold text-red-500">${(item.principal || 0).toFixed(2)}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-zinc-500">No hay deudas registradas.</p>}
                     </div>
                </div>
            </div>
        </div>
    );
  };
  
  const SettingsView: React.FC = () => {
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<Partial<User>>(user || {});
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    useEffect(() => {
        setFormData(user || {});
    }, [user]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                handleUpdateUser({ profilePicture: base64String });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        handleUpdateUser(formData);
        setIsEditing(false);
    };

    if (!user) return null;

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-8">
            <div>
                 <button onClick={() => setView('dashboard')} className="mb-4 inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 font-semibold hover:underline">
                    <ArrowLeftIcon className="w-5 h-5" /> Volver al Dashboard
                </button>
                <h1 className="text-3xl font-bold">Ajustes de Cuenta</h1>
            </div>

            <div className="p-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl space-y-6">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden"/>
                        {user.profilePicture ? 
                            <img src={user.profilePicture} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-zinc-200 dark:border-zinc-700 shadow-lg"/>
                            : <UserCircleIcon className="w-24 h-24 text-zinc-400 dark:text-zinc-500"/>
                        }
                        <button onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <CameraIcon className="w-8 h-8 text-white"/>
                        </button>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">{user.name}</h2>
                        <p className="text-zinc-500 dark:text-zinc-400">{user.occupation}</p>
                    </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-bold text-lg">Información Personal</h3>
                        {isEditing ? (
                            <div className="flex gap-2">
                                <Button onClick={() => setIsEditing(false)} variant="secondary">Cancelar</Button>
                                <Button onClick={handleSave}>Guardar Cambios</Button>
                            </div>
                        ) : (
                            <Button onClick={() => setIsEditing(true)} variant="secondary"><PencilIcon className="w-4 h-4 mr-2"/>Editar</Button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <Input label="Nombre Completo" name="name" value={formData.name || ''} onChange={handleChange} disabled={!isEditing}/>
                        <Input label="Documento de Identidad" name="idDocument" value={formData.idDocument || ''} onChange={handleChange} disabled={!isEditing}/>
                        <Input label="Correo Electrónico" name="email" type="email" value={formData.email || ''} onChange={handleChange} disabled={!isEditing}/>
                        <Input label="Número de Teléfono" name="phone" type="tel" value={formData.phone || ''} onChange={handleChange} disabled={!isEditing}/>
                        <Input label="Dirección" name="address" value={formData.address || ''} onChange={handleChange} disabled={!isEditing} containerClassName="md:col-span-2"/>
                    </div>
                </div>
            </div>
            
            <div className="p-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
                 <div className="flex justify-between items-center mb-3">
                    <h3 className="font-bold text-lg">Cuentas Bancarias</h3>
                    <Button onClick={() => setModal('add-account')} variant="ghost" className="!p-1.5 aspect-square !rounded-full"><PlusIcon className="w-5 h-5"/></Button>
                 </div>
                 {bankAccounts.length > 0 ? (
                    <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {bankAccounts.map(acc => (
                            <li key={acc.id} className="py-3 flex justify-between items-center group">
                              <div>
                                <p className="font-semibold">{acc.bankName}</p>
                                <p className="text-sm text-zinc-500 dark:text-zinc-400">{acc.accountName}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold">${acc.balance.toFixed(2)}</span>
                                <Button onClick={() => handleDeleteAccount(acc.id)} variant="ghost" className="!p-1.5 aspect-square !rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                    <TrashIcon className="w-5 h-5 text-red-500" />
                                </Button>
                              </div>
                            </li>
                        ))}
                    </ul>
                 ) : <p className="text-sm text-center py-4 text-zinc-500">No has agregado cuentas bancarias. Agrégalas para incluirlas en tus facturas.</p>}
             </div>
             
             <div className="p-6 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl">
                <h3 className="font-bold text-lg mb-4">Gestión de Datos</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                    <input type="file" id="import-file" className="hidden" onChange={handleImportData} accept=".json,application/json"/>
                    <Button onClick={() => document.getElementById('import-file')?.click()} variant="secondary" className="w-full">
                        <ArrowUpTrayIcon className="w-5 h-5 mr-2"/> Importar Datos
                    </Button>
                    <Button onClick={handleExportAllData} variant="secondary" className="w-full">
                        <ArrowDownTrayIcon className="w-5 h-5 mr-2"/> Exportar Todos los Datos
                    </Button>
                </div>
                <p className="text-xs text-center text-zinc-500 dark:text-zinc-400 mt-4">
                    Puedes exportar todos tus datos a un archivo .json para crear un respaldo o compartirlos. La importación fusionará los datos del archivo con tus datos actuales.
                </p>
            </div>
        </div>
    )
  };

  const AddItemModal: React.FC = () => {
    const [type, setType] = useState<ItemType>(ItemType.LOAN);
    const [formData, setFormData] = useState({ personName: '', personId: '', personPhone: '', description: '', startDate: new Date().toISOString().split('T')[0], dueDate: new Date().toISOString().split('T')[0], principal: '', interestRate: '', term: '', monthlyAmount: '', paymentDay: '1' });
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const commonData = { personName: formData.personName, personId: formData.personId, personPhone: formData.personPhone, description: formData.description, startDate: formData.startDate };
        if (type === ItemType.LOAN) {
            handleAddItem({ ...commonData, type, principal: parseFloat(formData.principal), interestRate: parseFloat(formData.interestRate), term: formData.term });
        } else if (type === ItemType.RENTAL) {
            handleAddItem({ ...commonData, type, monthlyAmount: parseFloat(formData.monthlyAmount), paymentDay: parseInt(formData.paymentDay, 10) });
        } else if (type === ItemType.DEBT) {
            handleAddItem({ ...commonData, type, principal: parseFloat(formData.principal), dueDate: formData.dueDate });
        } else {
             handleAddItem({ ...commonData, type, principal: parseFloat(formData.principal) });
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, [e.target.name]: e.target.value });

    return (
        <Modal isOpen={modal === 'add-item'} onClose={() => setModal(null)} title="Agregar Nuevo Registro">
            <form onSubmit={handleSubmit} className="space-y-4">
                 <div>
                    <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Tipo de Registro</label>
                    <select value={type} onChange={e => setType(e.target.value as ItemType)} className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {Object.values(ItemType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>
                <hr className="border-zinc-300 dark:border-zinc-700"/>
                <Input label={type === ItemType.DEBT ? 'Nombre del Acreedor' : "Nombre de la Persona"} name="personName" id="personName" type="text" onChange={handleChange} required />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Nº de Identificación (Opcional)" name="personId" id="personId" type="text" onChange={handleChange} />
                    <Input label="Teléfono (Opcional)" name="personPhone" id="personPhone" type="tel" onChange={handleChange} />
                </div>
                <Input label="Descripción" name="description" id="description" type="text" placeholder={type === ItemType.LOAN ? 'Ej: Préstamo personal' : type === ItemType.DEBT ? 'Ej: Tarjeta de crédito' : 'Ej: Arriendo Apto 101'} onChange={handleChange} required />

                {type === ItemType.LOAN && (<>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Monto Principal ($)" name="principal" type="number" step="0.01" onChange={handleChange} required />
                        <Input label="Tasa de Interés (%)" name="interestRate" type="number" step="0.1" onChange={handleChange} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Fecha de Inicio" name="startDate" type="date" value={formData.startDate} onChange={handleChange} required />
                        <Input label="Plazo" name="term" type="text" placeholder="Ej: 12 meses" onChange={handleChange} required />
                    </div>
                </>)}
                {type === ItemType.RENTAL && (<>
                    <div className="grid grid-cols-2 gap-4">
                        <Input label="Valor Mensual ($)" name="monthlyAmount" type="number" step="0.01" onChange={handleChange} required />
                        <Input label="Día de Pago (1-31)" name="paymentDay" type="number" min="1" max="31" onChange={handleChange} required />
                    </div>
                     <Input label="Fecha Inicio Contrato" name="startDate" type="date" value={formData.startDate} onChange={handleChange} required />
                </>)}
                 {type === ItemType.DEBT && (<>
                    <Input label="Monto Adeudado ($)" name="principal" type="number" step="0.01" onChange={handleChange} required />
                    <Input label="Fecha de Vencimiento" name="dueDate" type="date" value={formData.dueDate} onChange={handleChange} required />
                </>)}
                {type === ItemType.OTHER && (<>
                     <Input label="Monto del Ingreso ($)" name="principal" type="number" step="0.01" onChange={handleChange} required />
                     <Input label="Fecha" name="startDate" type="date" value={formData.startDate} onChange={handleChange} required />
                </>)}
                <div className="pt-4">
                    <Button type="submit" className="w-full">Guardar Registro</Button>
                </div>
            </form>
        </Modal>
    );
  };

  const AddPaymentModal: React.FC = () => {
    const [formData, setFormData] = useState({ amount: '', date: new Date().toISOString().split('T')[0], method: 'Efectivo', allocation: 'capital' as 'capital' | 'interes' });
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(activeItemId) {
            const payment: Omit<Payment, 'id' | 'receiptGenerated'> = { amount: parseFloat(formData.amount), date: formData.date, method: formData.method };
            if (activeItem?.type === ItemType.LOAN) {
                payment.allocation = formData.allocation;
            }
            handleAddPayment(activeItemId, payment);
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData({...formData, [e.target.name]: e.target.value });

    return (
        <Modal isOpen={modal === 'add-payment'} onClose={() => setModal(null)} title={`Registrar pago para ${activeItem?.personName}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input label="Monto del Pago ($)" name="amount" id="amount" type="number" step="0.01" onChange={handleChange} required />
                <Input label="Fecha del Pago" name="date" id="date" type="date" value={formData.date} onChange={handleChange} required />
                 <div>
                    <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Método de Pago</label>
                    <select name="method" value={formData.method} onChange={handleChange} className="w-full px-3.5 py-2.5 bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option>Efectivo</option> <option>Transferencia</option> <option>Tarjeta</option> <option>Otro</option>
                    </select>
                </div>
                {activeItem?.type === ItemType.LOAN && (
                    <div>
                         <label className="block text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-1.5">Abonar a</label>
                         <div className="flex gap-2">
                             <label className={`flex-1 text-center px-4 py-2 rounded-lg cursor-pointer transition-colors ${formData.allocation === 'capital' ? 'bg-blue-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
                                 <input type="radio" name="allocation" value="capital" checked={formData.allocation === 'capital'} onChange={handleChange} className="sr-only"/> Capital
                             </label>
                              <label className={`flex-1 text-center px-4 py-2 rounded-lg cursor-pointer transition-colors ${formData.allocation === 'interes' ? 'bg-blue-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800'}`}>
                                 <input type="radio" name="allocation" value="interes" checked={formData.allocation === 'interes'} onChange={handleChange} className="sr-only"/> Interés
                             </label>
                         </div>
                    </div>
                )}
                <div className="pt-4">
                    <Button type="submit" className="w-full">Registrar Pago</Button>
                </div>
            </form>
        </Modal>
    );
  };
  
  const GenerateInvoiceModal: React.FC = () => {
    const defaultAmount = activeItem?.monthlyAmount || (activeItem?.principal && activeItem.payments.length > 0 ? (activeItem.principal / (parseInt(activeItem.term || '12') || 12) ) : activeItem?.principal || 0);
    const [formData, setFormData] = useState<InvoiceDetails>({
        amount: defaultAmount || 0,
        concept: `Cuota de ${activeItem?.type.toLowerCase()} - ${activeItem?.description}`,
        dueDate: new Date().toISOString().split('T')[0]
    });
    
    useEffect(()=> {
        const defaultAmount = activeItem?.monthlyAmount || (activeItem?.principal && activeItem.payments.length > 0 ? (activeItem.principal / (parseInt(activeItem.term || '12') || 12) ) : activeItem?.principal || 0);
        setFormData({
            amount: defaultAmount || 0,
            concept: `Cuota de ${activeItem?.type.toLowerCase() || 'pago'} - ${activeItem?.description || ''}`,
            dueDate: new Date().toISOString().split('T')[0]
        })
    }, [activeItem])

    const handleGenerateClick = (outputType: 'download' | 'view') => {
        if(activeItem) {
            handleGenerateInvoice(activeItem, formData, outputType);
        }
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, [e.target.name]: e.target.value });

    return (
        <Modal isOpen={modal === 'generate-invoice'} onClose={() => setModal(null)} title={`Generar Factura para ${activeItem?.personName}`}>
            <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
                <Input label="Concepto de la Factura" name="concept" id="concept" type="text" value={formData.concept} onChange={handleChange} required />
                <div className="grid grid-cols-2 gap-4">
                    <Input label="Monto a Cobrar ($)" name="amount" id="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} required />
                    <Input label="Fecha de Vencimiento" name="dueDate" id="dueDate" type="date" value={formData.dueDate} onChange={handleChange} required />
                </div>
                <div className="p-3 bg-zinc-200/50 dark:bg-zinc-800/50 rounded-lg">
                    <p className="text-sm font-semibold mb-1">Se incluirá la siguiente información de pago:</p>
                    {bankAccounts.length > 0 ? bankAccounts.map(acc => (
                        <p key={acc.id} className="text-xs text-zinc-600 dark:text-zinc-400">- {acc.bankName} ({acc.accountName})</p>
                    )) : <p className="text-xs text-orange-500">No hay cuentas bancarias configuradas. Por favor, agregue una en Ajustes.</p>}
                </div>
                <div className="pt-4 flex items-center gap-4">
                    <Button type="button" variant="secondary" onClick={() => handleGenerateClick('view')} className="w-full"><EyeIcon className="w-4 h-4 mr-2"/> Ver Factura</Button>
                    <Button type="button" onClick={() => handleGenerateClick('download')} className="w-full"><ArrowDownTrayIcon className="w-4 h-4 mr-2"/> Descargar PDF</Button>
                </div>
            </form>
        </Modal>
    );
  };

  const AddReminderModal: React.FC = () => {
      const [formData, setFormData] = useState({ text: '', date: new Date().toISOString().split('T')[0] });
      const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          if(!formData.text || !formData.date) return;
          handleAddReminder(formData);
      };
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, [e.target.name]: e.target.value});

      return (
          <Modal isOpen={modal === 'add-reminder'} onClose={() => setModal(null)} title="Crear Recordatorio">
              <form onSubmit={handleSubmit} className="space-y-4">
                  <Input label="Descripción del recordatorio" name="text" id="text" type="text" value={formData.text} onChange={handleChange} required />
                  <Input label="Fecha" name="date" id="date" type="date" value={formData.date} onChange={handleChange} required />
                  <div className="pt-4">
                      <Button type="submit" className="w-full">Guardar Recordatorio</Button>
                  </div>
              </form>
          </Modal>
      );
  };

  const AddAccountModal: React.FC = () => {
      const [formData, setFormData] = useState({ bankName: '', accountName: '', balance: '' });
      const handleSubmit = (e: React.FormEvent) => {
          e.preventDefault();
          if(!formData.bankName || !formData.accountName || !formData.balance) return;
          handleAddAccount({ ...formData, balance: parseFloat(formData.balance) });
      };
      const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData({...formData, [e.target.name]: e.target.value});

      return (
          <Modal isOpen={modal === 'add-account'} onClose={() => setModal(null)} title="Agregar Cuenta Bancaria">
              <form onSubmit={handleSubmit} className="space-y-4">
                  <Input label="Nombre del Banco" name="bankName" id="bankName" type="text" value={formData.bankName} onChange={handleChange} required />
                  <Input label="Nombre/Tipo de Cuenta (Ej: Ahorros)" name="accountName" id="accountName" type="text" value={formData.accountName} onChange={handleChange} required />
                  <Input label="Saldo Actual ($)" name="balance" id="balance" type="number" step="0.01" value={formData.balance} onChange={handleChange} required />
                  <div className="pt-4">
                      <Button type="submit" className="w-full">Guardar Cuenta</Button>
                  </div>
              </form>
          </Modal>
      );
  };

  const PdfViewerModal: React.FC<{ src: string | null; onClose: () => void }> = ({ src, onClose }) => {
    if (!src) return null;
    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex justify-center items-center p-4 transition-opacity duration-300 animate-fade-in" onClick={onClose}>
          <div 
            className="relative bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] p-4 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Vista Previa del Documento</h2>
              <button onClick={onClose} className="p-1 rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-grow bg-zinc-200 dark:bg-zinc-800 rounded-lg overflow-hidden">
                <iframe src={src} className="w-full h-full border-0" title="PDF Preview" />
            </div>
          </div>
        </div>
    );
  };
  
  interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    children: React.ReactNode;
  }
  const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, children }) => {
    if (!isOpen) return null;
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[60] flex justify-center items-center p-4 transition-opacity duration-300 animate-fade-in" onClick={onClose}>
        <div 
          className="relative bg-zinc-100/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl w-full max-w-md p-6 transform transition-all duration-300 animate-slide-up"
          onClick={e => e.stopPropagation()}
        >
          <div className="text-center">
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">{title}</h2>
              <div className="text-sm text-zinc-600 dark:text-zinc-400 mb-8">
                  {children}
              </div>
              <div className="flex justify-center gap-4">
                  <Button onClick={onClose} variant="secondary" className="w-full">
                      Cancelar
                  </Button>
                  <Button onClick={onConfirm} variant="danger" className="w-full">
                      Confirmar
                  </Button>
              </div>
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen bg-zinc-100 dark:bg-zinc-950 text-xl font-semibold">Cargando Finovate...</div>;
  }
  
  const renderView = () => {
    if (!isLoggedIn) {
        if (view === 'register') return <RegistrationForm />;
        if (view === 'forgot-password') return <ForgotPasswordView />;
        return <LoginForm />;
    }
    switch (view) {
      case 'dashboard': return <Dashboard />;
      case 'detail': return <ItemDetailView />;
      case 'financial-summary': return <FinancialSummaryView />;
      case 'settings': return <SettingsView />;
      default: return <Dashboard />;
    }
  };

  return (
    <main className="min-h-screen">
        {isLoggedIn && <Header />}
        <div className={`transition-opacity duration-500 ${isLoggedIn ? 'opacity-100' : 'opacity-0'}`}>
           {isLoggedIn && <div className="container mx-auto max-w-7xl">{renderView()}</div>}
        </div>
         {!isLoggedIn && renderView()}
        <AddItemModal />
        <AddPaymentModal />
        <GenerateInvoiceModal />
        <AddReminderModal />
        <AddAccountModal />
        <PdfViewerModal src={pdfPreviewUrl} onClose={() => setPdfPreviewUrl(null)} />
        <ConfirmationModal
            isOpen={confirmation.isOpen}
            onClose={() => setConfirmation({ ...confirmation, isOpen: false })}
            onConfirm={confirmation.onConfirm}
            title={confirmation.title}
        >
            {confirmation.message}
        </ConfirmationModal>
    </main>
  );
};

export default App;
