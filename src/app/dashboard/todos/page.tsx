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
    <div className="min-h-screen text-white" suppressHydrationWarning>
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8">{themeStyles.header}</h1>
        
        {/* Debug section */}
        <div className={`${themeStyles.cardBg} p-4 rounded-lg shadow-lg mb-4 ${themeStyles.border}`}>
          <h3 className="text-sm font-semibold mb-2">Debug Info</h3>
          <p className="text-xs mb-2">User: {user ? `${user.uid.substring(0, 8)}...` : 'Not authenticated'}</p>
          <p className="text-xs mb-2">Firebase DB: {db ? 'Initialized' : 'Not initialized'}</p>
          <p className="text-xs mb-2">Firebase Auth: {auth ? 'Initialized' : 'Not initialized'}</p>
          <div className="flex gap-2 mt-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => {
                console.log("Debug - Current user:", user);
                console.log("Debug - Firebase DB:", db);
                console.log("Debug - Firebase Auth:", auth);
                toast.info("Check console for debug info");
              }}
            >
              Log Debug Info
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={async () => {
                try {
                  const testData = {
                    test: true,
                    timestamp: new Date().toISOString(),
                    userId: user?.uid || 'anonymous'
                  };
                  
                  const testRef = await addDoc(collection(db, "test_collection"), testData);
                  console.log("Test document written with ID: ", testRef.id);
                  toast.success("Test write successful!");
                } catch (error) {
                  console.error("Error writing test document: ", error);
                  toast.error(`Test write failed: ${error.message}`);
                }
              }}
            >
              Test Firestore Write
            </Button>
          </div>
        </div>
        
        {isClient && (
          <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg mb-8 ${themeStyles.border}`}>
            <h2 className="text-xl font-semibold mb-4">Add New Todo</h2>
            <div className="flex flex-col space-y-4">
              <Input
                type="text"
                placeholder="What needs to be done?"
                value={newTodo}
                onChange={(e) => setNewTodo(e.target.value)}
                className={`bg-slate-700 border ${themeStyles.border}`}
              />
              <Input
                type="text"
                placeholder="Description (optional)"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className={`bg-slate-700 border ${themeStyles.border}`}
              />
              <div className="flex items-center space-x-4">
                <label className={themeStyles.textSecondary}>Priority:</label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setNewPriority('low')}
                    className={`px-3 py-1 rounded-md ${newPriority === 'low' ? 'bg-green-600' : 'bg-slate-700'}`}
                  >
                    Low
                  </button>
                  <button
                    onClick={() => setNewPriority('medium')}
                    className={`px-3 py-1 rounded-md ${newPriority === 'medium' ? 'bg-yellow-600' : 'bg-slate-700'}`}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => setNewPriority('high')}
                    className={`px-3 py-1 rounded-md ${newPriority === 'high' ? 'bg-red-600' : 'bg-slate-700'}`}
                  >
                    High
                  </button>
                </div>
              </div>
              <Button
                onClick={handleAddTodo}
                disabled={!newTodo.trim()}
                className={`${themeStyles.primary} flex items-center`}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Todo
              </Button>
            </div>
          </div>
        )}
        
        <div className={`${themeStyles.cardBg} p-6 rounded-lg shadow-lg ${themeStyles.border}`}>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Your Todos</h2>
            <div className="flex space-x-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 rounded-md ${filter === 'all' ? themeStyles.primary : 'bg-slate-700'}`}
              >
                All
              </button>
              <button
                onClick={() => setFilter('active')}
                className={`px-3 py-1 rounded-md ${filter === 'active' ? themeStyles.primary : 'bg-slate-700'}`}
              >
                Active
              </button>
              <button
                onClick={() => setFilter('completed')}
                className={`px-3 py-1 rounded-md ${filter === 'completed' ? themeStyles.primary : 'bg-slate-700'}`}
              >
                Completed
              </button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className={`h-8 w-8 animate-spin ${themeStyles.accent}`} />
            </div>
          ) : filteredTodos.length > 0 ? (
            <div className="space-y-4">
              {filteredTodos.map(todo => (
                <div
                  key={todo.id}
                  className={`${themeStyles.itemCard} p-4 rounded-lg flex items-start justify-between ${themeStyles.border}`}
                >
                  <div className="flex items-start space-x-3 flex-grow">
                    <button
                      onClick={() => handleToggleComplete(todo.id)}
                      className={`p-2 rounded-full ${todo.completed ? 'bg-green-600' : 'bg-slate-600'} hover:bg-opacity-80 transition mt-1`}
                    >
                      {todo.completed ? (
                        <Check className="h-4 w-4 text-white" />
                      ) : (
                        <div className="h-4 w-4" />
                      )}
                    </button>
                    <div className="flex-grow">
                      <h3 className={`font-medium ${todo.completed ? 'line-through text-slate-400' : themeStyles.textPrimary}`}>
                        {todo.title}
                      </h3>
                      {todo.description && (
                        <p className={`text-sm mt-1 ${todo.completed ? 'line-through text-slate-500' : themeStyles.textMuted}`}>
                          {todo.description}
                        </p>
                      )}
                      <div className="flex items-center mt-2 text-xs text-slate-400">
                        <Clock className="h-3 w-3 mr-1" />
                        <span>Created {format(new Date(todo.createdAt), 'MMM d, yyyy')}</span>
                        <div className={`ml-3 w-2 h-2 rounded-full ${getPriorityColor(todo.priority)}`} />
                        <span className="ml-1">{todo.priority}</span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteTodo(todo.id)}
                    className="p-2 text-slate-400 hover:text-red-400 transition"
                  >
                    <Trash className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className={themeStyles.textMuted}>
                {filter === 'all' 
                  ? "You don't have any todos yet." 
                  : filter === 'active' 
                    ? "You don't have any active todos." 
                    : "You don't have any completed todos."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 