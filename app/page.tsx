'use client';

import { useEffect, useState } from 'react';
import { supabase, Todo } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { TodoInput, todoSchema, sanitizeInput, RateLimiter } from '@/lib/validation';
import { Plus, LogOut, Trash2, CheckCircle, Circle, Shield } from 'lucide-react';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-100 via-blue-50 to-purple-100">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-100 via-blue-50 to-purple-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-6 border border-white/20">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-purple-600 bg-clip-text text-transparent">
                🔒 Secure Todo App
              </h1>
              <p className="text-gray-600 mt-1">Welcome, {user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-full hover:from-gray-900 hover:to-black transition shadow-lg"
            >
              <LogOut size={18} />
              Logout
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl mb-6">
            {error}
          </div>
        )}

        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-6 mb-6 border border-white/20">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Add New Todo</h2>
          <div className="space-y-4">
            <input
              type="text"
              placeholder="Todo title..."
              value={newTodo.title}
              onChange={(e) => setNewTodo({ ...newTodo, title: e.target.value })}
              className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
              maxLength={200}
            />
            <textarea
              placeholder="Description (optional)..."
              value={newTodo.description}
              onChange={(e) => setNewTodo({ ...newTodo, description: e.target.value })}
              className="w-full px-5 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent transition"
              rows={3}
              maxLength={1000}
            />
            <button
              onClick={addTodo}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-800 to-gray-900 text-white rounded-full hover:from-gray-900 hover:to-black transition w-full justify-center font-medium shadow-lg"
            >
              <Plus size={20} />
              Add Todo
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {todos.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg p-8 text-center text-gray-500 border border-white/20">
              No todos yet. Add your first todo above!
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-lg p-5 hover:shadow-xl transition border border-white/20"
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleTodo(todo.id, todo.completed)}
                    className="mt-1 text-gray-400 hover:text-purple-500 transition"
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

        <div className="mt-8 bg-gradient-to-r from-green-50 to-purple-50 border border-purple-200 rounded-3xl p-5 backdrop-blur-xl">
          <h3 className="font-semibold text-transparent bg-gradient-to-r from-green-600 to-purple-600 bg-clip-text mb-3 flex items-center gap-2">
            <Shield className="text-purple-600" size={20} />
            Security Features Active
          </h3>
          <ul className="text-sm text-gray-700 space-y-1.5">
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