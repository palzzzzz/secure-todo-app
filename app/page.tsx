'use client';

import { useEffect, useState } from 'react';
import { supabase, Todo } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { TodoInput, todoSchema, sanitizeInput, RateLimiter } from '@/lib/validation';
import { Plus, LogOut, Trash2, CheckCircle, Circle } from 'lucide-react';

const rateLimiter = new RateLimiter();

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodo, setNewTodo] = useState({ title: '', description: '' });
  const [error, setError] = useState('');

  useEffect(() => {
    checkUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/auth/signin');
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push('/auth/signin');
      return;
    }
    setUser(user);
    fetchTodos();
  }

  async function fetchTodos() {
    try {
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function addTodo() {
    if (!rateLimiter.isAllowed('addTodo', 10, 60000)) {
      setError('Terlalu banyak request. Tunggu sebentar.');
      return;
    }

    try {
      setError('');
      const validated = todoSchema.parse(newTodo);
      const sanitized = {
        title: sanitizeInput(validated.title),
        description: validated.description ? sanitizeInput(validated.description) : null,
      };

      const { error } = await supabase.from('todos').insert([
        {
          title: sanitized.title,
          description: sanitized.description,
          completed: false,
        },
      ]);

      if (error) throw error;

      setNewTodo({ title: '', description: '' });
      fetchTodos();
    } catch (error: any) {
      setError(error.message || 'Gagal menambah todo');
    }
  }

  async function toggleTodo(id: string, completed: boolean) {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ completed: !completed })
        .eq('id', id);

      if (error) throw error;
      fetchTodos();
    } catch (error: any) {
      setError(error.message);
    }
  }

  async function deleteTodo(id: string) {
    if (!confirm('Yakin ingin menghapus todo ini?')) return;

    try {
      const { error } = await supabase.from('todos').delete().eq('id', id);
      if (error) throw error;
      fetchTodos();
    } catch (error: any) {
      setError(error.message);
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push('/auth/signin');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">🔒 Secure Todo App</h1>
              <p className="text-gray-600 mt-1">Welcome, {user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Add New Todo</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Todo title..."
              value={newTodo.title}
              onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              maxLength={200}
            />
            <textarea
              placeholder="Description (optional)..."
              value={newTodo.description}
              onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              maxLength={1000}
            />
            <button
              onClick={addTodo}
              className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition w-full justify-center font-medium"
            >
              <Plus size={20} />
              Add Todo
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {todos.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              No todos yet. Add your first todo above!
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition"
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleTodo(todo.id, todo.completed)}
                    className="mt-1 text-gray-400 hover:text-blue-500 transition"
                  >
                    {todo.completed ? (
                      <CheckCircle size={24} className="text-green-500" />
                    ) : (
                      <Circle size={24} />
                    )}
                  </button>
                  <div className="flex-1">
                    <h3
                      className={`text-lg font-medium ${
                        todo.completed ? 'line-through text-gray-400' : 'text-gray-800'
                      }`}
                    >
                      {todo.title}
                    </h3>
                    {todo.description && (
                      <p className="text-gray-600 mt-1">{todo.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-2">
                      {new Date(todo.created_at).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="text-red-400 hover:text-red-600 transition"
                  >
                    <Trash2 size={20} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">🔐 Security Features Active:</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>✓ HTTPS/SSL Encryption</li>
            <li>✓ Row Level Security (RLS)</li>
            <li>✓ Input Validation & Sanitization</li>
            <li>✓ Rate Limiting Protection</li>
            <li>✓ XSS Prevention</li>
          </ul>
        </div>
      </div>
    </main>
  );
}