import React, { useState, useEffect } from 'react';
import { FaHome, FaHistory, FaChartBar, FaCog, FaPlus, FaTrash, FaCreditCard, FaFileExport } from 'react-icons/fa';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from 'recharts';
import DatePicker from 'react-datepicker';
import Modal from 'react-modal';
import * as XLSX from 'xlsx';
import "react-datepicker/dist/react-datepicker.css";
import { db, auth } from '../firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
import withSubscription from '../withSubscription';
import { useSubscription } from '../SubscriptionContext';
import UpgradeButton from './UpgradeButton';

Modal.setAppElement('#root');

const ExpenseTracker = () => {
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState(['Mortgage / Rent', 'Food', 'Utilities', 'Bills', 'Shopping', 'Transportation', 'Insurance', 'Health Care', 'Clothing', 'Others']);
  const [newTransaction, setNewTransaction] = useState({
    type: 'expense',
    amount: '',
    category: '',
    description: '',
    date: new Date(),
    isRecurring: false,
    recurringFrequency: 'monthly',
  });
  const [currentView, setCurrentView] = useState('dashboard');
  const [currency, setCurrency] = useState('CAD');
  const [dateRange, setDateRange] = useState([new Date(new Date().getFullYear(), new Date().getMonth(), 1), new Date()]);
  const [newCategory, setNewCategory] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [summary, setSummary] = useState({ totalIncome: 0, totalExpenses: 0, balance: 0, transactions: 0 });

  const { subscriptionStatus } = useSubscription();

  useEffect(() => {
    // Clear all transactions
    setExpenses([]);
    setIncomes([]);

    // Load other data from localStorage
    const savedCategories = JSON.parse(localStorage.getItem('categories')) || categories;
    const savedCurrency = localStorage.getItem('currency') || 'CAD';

    setCategories(savedCategories);
    setCurrency(savedCurrency);
  }, []);

  useEffect(() => {
    // Save data to localStorage whenever it changes
    localStorage.setItem('expenses', JSON.stringify(expenses));
    localStorage.setItem('incomes', JSON.stringify(incomes));
    localStorage.setItem('categories', JSON.stringify(categories));
    localStorage.setItem('currency', currency);
  }, [expenses, incomes, categories, currency]);

  const addTransaction = async (transaction) => {
    if (subscriptionStatus !== 'premium' && expenses.length + incomes.length >= 10) {
      alert('You have reached the limit for free users. Please upgrade to add more transactions.');
      return;
    }

    const newTransactionWithId = { ...transaction, id: Date.now(), amount: parseFloat(transaction.amount) };
    
    try {
      const docRef = await addDoc(collection(db, 'transactions'), {
        ...newTransactionWithId,
        userId: auth.currentUser.uid,
      });

      if (transaction.type === 'expense') {
        setExpenses([...expenses, { ...newTransactionWithId, id: docRef.id }]);
      } else {
        setIncomes([...incomes, { ...newTransactionWithId, id: docRef.id }]);
      }

      // Update the summary immediately
      const summary = getSummaryForTransactions([...expenses, newTransactionWithId], [...incomes, newTransactionWithId]);
      setSummary(summary);
    } catch (error) {
      console.error("Error adding transaction: ", error);
    }

    // Reset the form
    setNewTransaction({
      type: 'expense',
      amount: '',
      category: '',
      description: '',
      date: new Date(),
      isRecurring: false,
      recurringFrequency: 'monthly',
    });
  };

  const getSummaryForTransactions = (currentExpenses, currentIncomes) => {
    const filteredExpenses = currentExpenses.filter(expense => 
      new Date(expense.date) >= dateRange[0] && new Date(expense.date) <= dateRange[1]
    );
    const filteredIncomes = currentIncomes.filter(income => 
      new Date(income.date) >= dateRange[0] && new Date(income.date) <= dateRange[1]
    );
    const totalIncome = filteredIncomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const balance = totalIncome - totalExpenses;
    const transactions = filteredExpenses.length + filteredIncomes.length;

    return { totalIncome, totalExpenses, balance, transactions };
  };

  const deleteTransaction = async (id, type) => {
  try {
    await deleteDoc(doc(db, 'transactions', id));

    if (type === 'expense') {
      setExpenses(prevExpenses => {
        if (!Array.isArray(prevExpenses)) {
          console.error('prevExpenses is not an array:', prevExpenses);
          return [];
        }
        return prevExpenses.filter(expense => expense.id !== id);
      });
    } else {
      setIncomes(prevIncomes => {
        if (!Array.isArray(prevIncomes)) {
          console.error('prevIncomes is not an array:', prevIncomes);
          return [];
        }
        return prevIncomes.filter(income => income.id !== id);
      });
    }

    console.log(`Transaction ${id} deleted successfully`);
  } catch (error) {
    console.error("Error deleting transaction: ", error);
  }
};

 useEffect(() => {
  const fetchTransactions = async () => {
    if (auth.currentUser) {
      const q = query(collection(db, 'transactions'), where("userId", "==", auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      const fetchedTransactions = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        date: doc.data().date.toDate(),
      }));

      setExpenses(fetchedTransactions.filter(t => t.type === 'expense') || []);
      setIncomes(fetchedTransactions.filter(t => t.type === 'income') || []);

      const summary = getSummaryForTransactions(
        fetchedTransactions.filter(t => t.type === 'expense') || [],
        fetchedTransactions.filter(t => t.type === 'income') || []
      );
      setSummary(summary);
    }
  };

  fetchTransactions();
}, []);

  const getTransactionsInDateRange = () => {
    const [start, end] = dateRange;
    return {
      expenses: expenses.filter(expense => new Date(expense.date) >= start && new Date(expense.date) <= end),
      incomes: incomes.filter(income => new Date(income.date) >= start && new Date(income.date) <= end)
    };
  };

  const getSummary = () => {
    const { expenses: currentExpenses, incomes: currentIncomes } = getTransactionsInDateRange();
    const totalIncome = currentIncomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = currentExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const balance = totalIncome - totalExpenses;
    const transactions = currentExpenses.length + currentIncomes.length;

    return { totalIncome, totalExpenses, balance, transactions };
  };

  const getExpensesByCategory = () => {
    const { expenses: currentExpenses } = getTransactionsInDateRange();
    return categories.map(category => ({
      name: category,
      value: currentExpenses
        .filter(expense => expense.category === category)
        .reduce((sum, expense) => sum + expense.amount, 0)
    })).filter(category => category.value > 0);
  };

  const getFinancialStatistics = () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentYear = new Date().getFullYear();

    return monthNames.map(month => {
      const monthExpenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate.getFullYear() === currentYear && monthNames[expenseDate.getMonth()] === month;
      });
      const monthIncomes = incomes.filter(income => {
        const incomeDate = new Date(income.date);
        return incomeDate.getFullYear() === currentYear && monthNames[incomeDate.getMonth()] === month;
      });
      return {
        name: month,
        Expenses: monthExpenses.reduce((sum, expense) => sum + expense.amount, 0),
        Income: monthIncomes.reduce((sum, income) => sum + income.amount, 0)
      };
    });
  };

  const exportToExcel = () => {
    if (subscriptionStatus !== 'premium') {
      alert('Exporting to Excel is a premium feature. Please upgrade to use this feature.');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const expenseData = expenses.map(({ id, ...rest }) => rest);
    const incomeData = incomes.map(({ id, ...rest }) => rest);

    const expenseSheet = XLSX.utils.json_to_sheet(expenseData);
    XLSX.utils.book_append_sheet(workbook, expenseSheet, "Expenses");

    const incomeSheet = XLSX.utils.json_to_sheet(incomeData);
    XLSX.utils.book_append_sheet(workbook, incomeSheet, "Income");

    XLSX.writeFile(workbook, "expense_tracker_data.xlsx");
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#A4DE6C', '#D0ED57', '#FAD000', '#F0E68C'];

  const renderDashboard = () => {
    const summary = getSummary();
    const financialStats = getFinancialStatistics();

    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="col-span-1 md:col-span-4 flex justify-between items-center mb-4">
          <DatePicker
            selectsRange={true}
            startDate={dateRange[0]}
            endDate={dateRange[1]}
            onChange={(update) => {
              setDateRange(update);
              const newSummary = getSummaryForTransactions(expenses, incomes);
              setSummary(newSummary);
            }}
            className="p-2 rounded bg-white text-gray-800 border border-gray-300"
          />
        </div>
        <div className="bg-white p-4 rounded-lg shadow dark:bg-dark-background text-gray-800 dark:text-gray-400">
          <h3 className="text-lg font-bold">Income</h3>
          <p className="text-2xl font-bold text-green-500">{summary.totalIncome.toFixed(2)} {currency}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow dark:bg-dark-background text-gray-800 dark:text-gray-400">
          <h3 className="text-lg font-bold">Expenses</h3>
          <p className="text-2xl font-bold text-red-500">{summary.totalExpenses.toFixed(2)} {currency}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow dark:bg-dark-background text-gray-800 dark:text-gray-400">
          <h3 className="text-lg font-bold">Balance</h3>
          <p className="text-2xl font-bold text-blue-500">{summary.balance.toFixed(2)} {currency}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow dark:bg-dark-background text-gray-800 dark:text-gray-400">
          <h3 className="text-lg font-bold">Transactions</h3>
          <p className="text-2xl font-bold text-purple-500">{summary.transactions}</p>
        </div>
        <div className="col-span-1 md:col-span-4 bg-white p-4 rounded-lg shadow text-gray-800 dark:text-gray-400 dark:bg-dark-background">
          <h3 className="text-xl font-bold mb-4">Financial Statistics</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={financialStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Income" fill="#34D399" />
              <Bar dataKey="Expenses" fill="#F87171" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="col-span-1 md:col-span-2 bg-white p-4 rounded-lg shadow text-gray-800 dark:text-gray-400 dark:bg-dark-background">
          <h3 className="text-xl font-bold mb-4">Add Transaction</h3>
          <form onSubmit={(e) => { e.preventDefault(); addTransaction(newTransaction); }} className="space-y-3">
                <select
                  value={newTransaction.type}
                  onChange={(e) => setNewTransaction({ ...newTransaction, type: e.target.value })}
                  className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
                <input
                  type="number"
                  value={newTransaction.amount}
                  onChange={(e) => setNewTransaction({ ...newTransaction, amount: e.target.value })}
                  placeholder="Amount"
                  className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <DatePicker
                  selected={newTransaction.date}
                  onChange={(date) => setNewTransaction({ ...newTransaction, date })}
                  className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {newTransaction.type === 'expense' && (
                  <div className="flex items-center">
                    <select
                      value={newTransaction.category}
                      onChange={(e) => setNewTransaction({ ...newTransaction, category: e.target.value })}
                      className="flex-grow p-2 rounded-l border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Category</option>
                      {categories.map(category => (
                        <option key={category} value={category}>{category}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setIsModalOpen(true)}
                      className="bg-customorange-500 text-white p-2 rounded-r hover:bg-customorange-400 transition duration-200"
                    >
                      <FaPlus />
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  value={newTransaction.description}
                  onChange={(e) => setNewTransaction({ ...newTransaction, description: e.target.value })}
                  placeholder="Description"
                  className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newTransaction.isRecurring}
                    onChange={(e) => setNewTransaction({ ...newTransaction, isRecurring: e.target.checked })}
                    className="mr-2"
                  />
                  <label className="text-gray-800 dark:text-gray-400">Recurring Transaction</label>
                </div>
                {newTransaction.isRecurring && (
                  <select
                    value={newTransaction.recurringFrequency}
                    onChange={(e) => setNewTransaction({ ...newTransaction, recurringFrequency: e.target.value })}
                    className="w-full p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                )}
                <button type="submit" className="w-full bg-customorange-500 text-white p-2 rounded hover:bg-customorange-400 transition duration-200">Add Transaction</button>
              </form>
        </div>
        <div className="col-span-1 md:col-span-2 bg-white p-4 rounded-lg shadow text-gray-800 dark:text-gray-400 dark:bg-dark-background">
          <h3 className="text-xl font-bold mb-4">Recent Transactions</h3>
          <ul className="space-y-2">
            {[...expenses, ...incomes]
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .slice(0, 10)
              .map(transaction => (
                <li key={transaction.id} className="flex justify-between items-center py-2 border-b border-gray-200">
                      <div>
                        <span className="font-medium">{transaction.description || transaction.category}</span>
                        <span className="text-sm text-gray-500 block">{new Date(transaction.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center">
                        <span className={`${transaction.type === 'income' ? 'text-green-500' : 'text-red-500'} font-medium mr-2`}>
                          {transaction.type === 'income' ? '+' : '-'}{transaction.amount} {currency}
                        </span>
                        <button onClick={() => deleteTransaction(transaction.id, transaction.type)} className="text-red-500 hover:text-red-700">
                          <FaTrash />
                        </button>
                      </div>
                    </li>
              ))}
          </ul>
        </div>
      </div>
    );
  };

 const renderTotalExpenses = () => {
    const expensesByCategory = getExpensesByCategory();
    const total = expensesByCategory.reduce((sum, category) => sum + category.value, 0);

    return (
      <div className="bg-white p-6 rounded-lg shadow text-gray-800 dark:text-gray-400 dark:bg-dark-background-2">
        <h3 className="text-xl font-bold mb-4">Total Expenses</h3>
        <div className="flex justify-between items-center mb-6 text-gray-800 dark:text-gray-800">
          <DatePicker
            selectsRange={true}
            startDate={dateRange[0]}
            endDate={dateRange[1]}
            onChange={(update) => {
              setDateRange(update);
            }}
            className="p-2 rounded border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expensesByCategory}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  label
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2">
            {expensesByCategory.map((category, index) => (
              <div key={category.name} className="flex justify-between items-center">
                <span className="flex items-center">
                  <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                  {category.name}
                </span>
                <span className="font-medium">{category.value.toFixed(2)} {currency} ({((category.value / total) * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="bg-white p-4 rounded-lg shadow dark:bg-dark-background-2 text-gray-800 dark:text-gray-400">
      <h3 className="text-xl font-bold mb-4">Transaction History</h3>
      <DatePicker
        selectsRange={true}
        startDate={dateRange[0]}
        endDate={dateRange[1]}
        onChange={(update) => {
          setDateRange(update);
          const newSummary = getSummaryForTransactions(expenses, incomes);
          setSummary(newSummary);
        }}
        className="p-2 rounded bg-white text-gray-800 border border-gray-300 mb-4"
      />
      <ul className="space-y-2">
        {[...expenses, ...incomes]
          .filter(transaction => 
            new Date(transaction.date) >= dateRange[0] && 
            new Date(transaction.date) <= dateRange[1]
          )
          .sort((a, b) => new Date(b.date) - new Date(a.date))
          .map(transaction => (
            <li key={transaction.id} className="flex justify-between items-center text-gray-800 border-b pb-2">
              <div>
                <span>{transaction.description || transaction.category}</span>
                <span className="text-gray-500 text-sm ml-2">
                  {new Date(transaction.date).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center">
                <span className={transaction.type === 'income' ? 'text-green-500 mr-2' : 'text-red-500 mr-2'}>
                  {transaction.type === 'income' ? '+' : '-'}{transaction.amount} {currency}
                </span>
                <button onClick={() => deleteTransaction(transaction.id, transaction.type)} className="text-red-500">
                  <FaTrash />
                </button>
              </div>
            </li>
          ))}
      </ul>
    </div>
  );

  const renderSettings = () => (
    <div className="bg-white p-4 rounded-lg shadow text-gray-800 dark:text-gray-400 dark:bg-dark-background-2">
      <h3 className="text-xl font-bold mb-4">Settings</h3>
      <div className="mb-4">
        <label className="block mb-2">Currency</label>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          className="w-full p-2 rounded bg-white text-gray-800 border border-gray-300"
        >
          <option value="CAD">CAD</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
          <option value="GBP">GBP</option>
        </select>
      </div>
      <button 
        onClick={exportToExcel} 
        className="w-full bg-green-500 text-white p-2 rounded mb-4 flex items-center justify-center hover:bg-green-600 transition duration-200"
        disabled={subscriptionStatus !== 'premium'}
      >
        <FaFileExport className="mr-2" /> Export to Excel
      </button>
      {subscriptionStatus !== 'premium' && (
        <p className="text-sm text-gray-600 mb-4">Exporting to Excel is a premium feature.</p>
      )}
      <div className="mt-4">
        <h4 className="text-gray-800 mb-2">Manage Categories</h4>
        <ul className="space-y-2">
          {categories.map(category => (
            <li key={category} className="flex justify-between items-center">
              <span>{category}</span>
              <button
                onClick={() => setCategories(categories.filter(c => c !== category))}
                className="text-red-500 hover:text-red-600 transition duration-200"
              >
                <FaTrash />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  return (
    <div className="bg-gray-100 p-6 rounded-lg shadow-lg dark:bg-dark-background-2 text-gray-800 dark:text-gray-400">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-400">Expense Tracker</h2>
        <div className="flex space-x-4">
          <button onClick={() => setCurrentView('dashboard')} className="text-2xl text-gray-600 hover:text-gray-800 dark:text-gray-400"><FaHome /></button>
          <button onClick={() => setCurrentView('totalExpenses')} className="text-2xl text-gray-600 hover:text-gray-800 dark:text-gray-400"><FaChartBar /></button>
          <button onClick={() => setCurrentView('history')} className="text-2xl text-gray-600 hover:text-gray-800 dark:text-gray-400"><FaHistory /></button>
          <button onClick={() => setCurrentView('settings')} className="text-2xl text-gray-600 hover:text-gray-800 dark:text-gray-400"><FaCreditCard /></button>
        </div>
      </div>
      {currentView === 'dashboard' && renderDashboard()}
      {currentView === 'totalExpenses' && renderTotalExpenses()}
      {currentView === 'history' && renderHistory()}
      {currentView === 'settings' && renderSettings()}

      <Modal
        isOpen={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
        contentLabel="Add New Category"
        className="bg-white p-4 rounded-lg w-80 mx-auto mt-20"
        overlayClassName="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start"
      >
        <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Category</h2>
        <form onSubmit={(e) => {
          e.preventDefault();
          if (newCategory.trim() !== '') {
            setCategories([...categories, newCategory.trim()]);
            setNewCategory('');
            setIsModalOpen(false);
          }
        }} className="space-y-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="New Category Name"
            className="w-full p-2 rounded bg-white text-gray-800 border border-gray-300"
          />
          <div className="flex justify-end space-x-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="bg-red-500 text-white p-2 rounded hover:bg-red-600 transition duration-200">Cancel</button>
            <button type="submit" className="bg-customorange-500 text-white p-2 rounded hover:bg-customorange-400 transition duration-200">Add Category</button>
          </div>
        </form>
      </Modal>

      {subscriptionStatus !== 'premium' && (
        <div className="mt-4 p-4 bg-yellow-100 rounded-lg">
          <h3 className="text-lg font-bold">Upgrade to Premium</h3>
          <p className="text-yellow-800 mb-10">You cancelled your premium subscription, you will have limited access. Upgrade to premium for unlimited transactions and advanced features.</p>
          <UpgradeButton />
        </div>
      )}
    </div>
  );
};

export default withSubscription(ExpenseTracker, 'premium');
