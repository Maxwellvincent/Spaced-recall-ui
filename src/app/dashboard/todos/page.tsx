"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getFirebaseDb, auth } from '@/lib/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/contexts/theme-context";
import { Loader2, Plus, Check, Trash, Clock, CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { format } from "date-fns";
import { ThemedHeader } from '@/components/ui/themed-header';

// Use getFirebaseDb() to ensure proper initialization
const db = getFirebaseDb();

// Add debug logging
console.log("Firebase DB initialized:", db ? "Yes" : "No");
console.log("Firebase Auth initialized:", auth ? "Yes" : "No");

interface Todo {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  createdAt: string;
  dueDate?: string;
  userId: string;
  priority: 'low' | 'medium' | 'high';
}

export default function TodosPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodo, setNewTodo] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [isClient, setIsClient] = useState(false);
  
  // Set isClient to true when component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // Get theme information
  const { theme } = useTheme();
  
  // Function to get theme-specific styles
  const getThemeStyles = () => {
    switch (theme?.toLowerCase()) {
      case 'dbz':
        return {
          primary: 'bg-yellow-600 hover:bg-yellow-700',
          secondary: 'bg-yellow-700/50',
          accent: 'text-yellow-400',
          border: 'border-yellow-600',
          cardBg: 'bg-yellow-950/50',
          itemCard: 'bg-yellow-900 hover:bg-yellow-800',
          progressBar: 'bg-yellow-500',
          header: 'Training Tasks',
          buttonHover: 'hover:bg-yellow-700',
          textPrimary: 'text-white',
          textSecondary: 'text-yellow-100',
          textMuted: 'text-yellow-200/80'
        };
      case 'naruto':
        return {
          primary: 'bg-orange-600 hover:bg-orange-700',
          secondary: 'bg-orange-700/50',
          accent: 'text-orange-400',
          border: 'border-orange-600',
          cardBg: 'bg-orange-950/50',
          itemCard: 'bg-orange-900 hover:bg-orange-800',
          progressBar: 'bg-orange-500',
          header: 'Ninja Tasks',
          buttonHover: 'hover:bg-orange-700',
          textPrimary: 'text-white',
          textSecondary: 'text-orange-100',
          textMuted: 'text-orange-200/80'
        };
      case 'hogwarts':
        return {
          primary: 'bg-purple-600 hover:bg-purple-700',
          secondary: 'bg-purple-700/50',
          accent: 'text-purple-400',
          border: 'border-purple-600',
          cardBg: 'bg-purple-950/50',
          itemCard: 'bg-purple-900 hover:bg-purple-800',
          progressBar: 'bg-purple-500',
          header: 'Magical Tasks',
          buttonHover: 'hover:bg-purple-700',
          textPrimary: 'text-white',
          textSecondary: 'text-purple-100',
          textMuted: 'text-purple-200/80'
        };
      default:
        return {
          primary: 'bg-blue-600 hover:bg-blue-700',
          secondary: 'bg-blue-700/50',
          accent: 'text-blue-400',
          border: 'border-blue-600',
          cardBg: 'bg-slate-800',
          itemCard: 'bg-slate-700 hover:bg-slate-600',
          progressBar: 'bg-blue-500',
          header: 'Todo List',
          buttonHover: 'hover:bg-blue-700',
          textPrimary: 'text-white',
          textSecondary: 'text-slate-100',
          textMuted: 'text-slate-300'
        };
    }
  };

  const themeStyles = getThemeStyles();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }

    // Add auth status check
    if (user) {
      console.log("User authenticated:", user.uid);
      console.log("Auth token:", user.getIdToken ? "Available" : "Not available");
    }

    const fetchTodos = async () => {
      if (!user) return;

      try {
        setLoading(true);
        console.log("Fetching todos for user:", user.uid);
        
        const todosQuery = query(
          collection(db, "todos"),
          where("userId", "==", user.uid)
        );
        
        try {
          const querySnapshot = await getDocs(todosQuery);
          console.log("Query executed, docs count:", querySnapshot.docs.length);
          
          const todosList = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Todo[];
          
          // Sort by creation date (newest first)
          todosList.sort((a, b) => 
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          
          setTodos(todosList);
        } catch (queryError) {
          console.error("Error executing Firestore query:", queryError);
          toast.error("Failed to load todos: " + (queryError.message || "Unknown error"));
        }
      } catch (error) {
        console.error("Error fetching todos:", error);
        toast.error("Failed to load todos");
      } finally {
        setLoading(false);
      }
    };

    fetchTodos();
  }, [user, authLoading, router]);

  const handleAddTodo = async () => {
    if (!user || !newTodo.trim()) {
      console.log("Cannot add todo: user is null or todo title is empty", { user, todoTitle: newTodo });
      toast.error("Please enter a todo title");
      return;
    }

    try {
      console.log("Adding todo:", newTodo);
      console.log("Current user:", user);
      
      const todoData = {
        title: newTodo,
        description: newDescription,
        completed: false,
        createdAt: new Date().toISOString(),
        userId: user.uid,
        priority: newPriority
      };

      console.log("Todo data:", todoData);
      console.log("Adding to Firestore collection 'todos'");
      
      try {
        const docRef = await addDoc(collection(db, "todos"), todoData);
        console.log("Todo added with ID:", docRef.id);
        
        const newTodoItem = {
          id: docRef.id,
          ...todoData
        } as Todo;
        
        setTodos(prev => [newTodoItem, ...prev]);
        setNewTodo("");
        setNewDescription("");
        toast.success("Todo added successfully");
      } catch (firestoreError) {
        console.error("Firestore error details:", firestoreError);
        console.error("Error code:", firestoreError.code);
        console.error("Error message:", firestoreError.message);
        toast.error(`Failed to add todo: ${firestoreError.message}`);
      }
    } catch (error) {
      console.error("Error adding todo:", error);
      toast.error("Failed to add todo");
    }
  };

  const handleToggleComplete = async (todoId: string) => {
    try {
      const todoToUpdate = todos.find(todo => todo.id === todoId);
      if (!todoToUpdate) return;

      const todoRef = doc(db, "todos", todoId);
      await updateDoc(todoRef, {
        completed: !todoToUpdate.completed
      });

      setTodos(prev => prev.map(todo => 
        todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
      ));

      toast.success(`Todo marked as ${todoToUpdate.completed ? 'active' : 'completed'}`);
    } catch (error) {
      console.error("Error updating todo:", error);
      toast.error("Failed to update todo");
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    try {
      const todoRef = doc(db, "todos", todoId);
      await deleteDoc(todoRef);

      setTodos(prev => prev.filter(todo => todo.id !== todoId));
      toast.success("Todo deleted successfully");
    } catch (error) {
      console.error("Error deleting todo:", error);
      toast.error("Failed to delete todo");
    }
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'all') return true;
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-blue-500';
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className={`h-8 w-8 animate-spin mx-auto mb-4 ${themeStyles.accent}`} />
          <p className={themeStyles.textPrimary}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Luxury Top Bar */}
      <div className="px-4 pt-8 pb-4">
        <ThemedHeader
          theme={theme}
          title={themeStyles.header}
          subtitle="Stay on top of your tasks"
          className="mb-6 shadow-lg"
        />
      </div>

      <div className="flex-1 w-full max-w-3xl mx-auto px-4 pb-8 flex flex-col gap-8">
        {/* Streak luxury widget */}
        <div className="luxury-card p-8 animate-fadeIn mb-8 flex items-center gap-6">
          <div className="flex flex-col items-center justify-center">
            <span className="text-4xl font-bold animate-pulse">🔥</span>
            <span className="text-lg font-semibold mt-2">Streak</span>
            <span className="text-2xl font-bold mt-1">3 days</span>
            <span className="text-xs text-slate-400">Keep your streak alive!</span>
          </div>
        </div>

        {/* Quick Add Todo luxury card */}
        <div className="luxury-card p-8 animate-fadeIn mb-8">
          <h2 className="text-xl font-semibold mb-4">Add New Todo</h2>
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <Input
              type="text"
              placeholder="What needs to be done?"
              value={newTodo}
              onChange={e => setNewTodo(e.target.value)}
              className="rounded-lg shadow w-full md:w-1/3"
            />
            <Input
              type="text"
              placeholder="Description (optional)"
              value={newDescription}
              onChange={e => setNewDescription(e.target.value)}
              className="rounded-lg shadow w-full md:w-1/2"
            />
            <Button
              onClick={handleAddTodo}
              className="rounded-lg shadow bg-blue-600 hover:bg-blue-700 transition-all px-6 py-3 text-lg font-semibold"
              disabled={!newTodo.trim()}
            >
              <Plus className="h-5 w-5 mr-2" /> Add Todo
            </Button>
          </div>
        </div>

        {/* Todos List luxury cards */}
        <div className="grid grid-cols-1 gap-6">
          {todos.length === 0 ? (
            <div className="luxury-card p-8 text-center text-slate-400 animate-fadeIn">No todos yet. Start by adding one above!</div>
          ) : (
            todos.map(todo => (
              <div key={todo.id} className="luxury-card p-6 animate-fadeIn flex flex-col gap-2">
                <div className="flex items-center gap-4 mb-2">
                  <button
                    onClick={() => handleToggleComplete(todo.id)}
                    className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${todo.completed ? 'bg-green-500 border-green-500' : 'bg-slate-800 border-slate-500 hover:bg-slate-700'}`}
                    aria-label={todo.completed ? 'Mark as active' : 'Mark as completed'}
                  >
                    {todo.completed && <Check className="h-4 w-4 text-white" />}
                  </button>
                  <div className="flex-1">
                    <span className={`text-lg font-semibold ${todo.completed ? 'line-through text-slate-400' : 'text-slate-100'}`}>{todo.title}</span>
                    {todo.description && <p className="text-slate-400 text-sm mt-1">{todo.description}</p>}
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(todo.priority)}`}>{todo.priority}</span>
                  <Button size="sm" variant="destructive" className="rounded-lg shadow hover:shadow-lg transition-all" onClick={() => handleDeleteTodo(todo.id)}>
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
                {todo.dueDate && <span className="text-xs text-slate-400">Due: {format(new Date(todo.dueDate), 'MMM d')}</span>}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 