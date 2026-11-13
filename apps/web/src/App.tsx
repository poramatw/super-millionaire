import { SHARED_PACKAGE_NAME } from '@super-millionaire/shared';

export default function App() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">Super Millionaire</h1>
        <p className="text-sm text-slate-400">Workspace scaffold ready ({SHARED_PACKAGE_NAME})</p>
      </div>
    </main>
  );
}
