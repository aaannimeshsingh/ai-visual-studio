export default function TestEnv() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
      <div className="space-y-2">
        <p>Supabase URL: {process.env.NEXT_PUBLIC_SUPABASE_URL || '❌ NOT LOADED'}</p>
        <p>Supabase Key: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ Loaded' : '❌ NOT LOADED'}</p>
      </div>
    </div>
  );
}