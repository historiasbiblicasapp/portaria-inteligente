import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-300">404</h1>
        <p className="text-xl text-gray-600 mt-2">Página não encontrada</p>
        <Link href="/dashboard" className="btn-primary mt-6 inline-block px-6 py-3">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
