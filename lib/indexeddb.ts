import { openDB, IDBPDatabase } from 'idb';
import { Pessoa, Acesso, PreCadastroOffline } from '@/lib/types';

const DB_NAME = 'portaria-inteligente';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pessoas')) {
          const pessoaStore = db.createObjectStore('pessoas', { keyPath: 'id' });
          pessoaStore.createIndex('cpf', 'cpf', { unique: true });
          pessoaStore.createIndex('qr_code', 'qr_code', { unique: true });
          pessoaStore.createIndex('nome', 'nome', { unique: false });
          pessoaStore.createIndex('placa', 'placa', { unique: false });
          pessoaStore.createIndex('synced', 'synced', { unique: false });
        }
        if (!db.objectStoreNames.contains('acessos')) {
          const acessoStore = db.createObjectStore('acessos', { keyPath: 'id' });
          acessoStore.createIndex('pessoa_id', 'pessoa_id', { unique: false });
          acessoStore.createIndex('synced', 'synced', { unique: false });
          acessoStore.createIndex('data_entrada', 'data_entrada', { unique: false });
        }
        if (!db.objectStoreNames.contains('pre_cadastros')) {
          const preCadastroStore = db.createObjectStore('pre_cadastros', { keyPath: 'id' });
          preCadastroStore.createIndex('synced', 'synced', { unique: false });
        }
      },
    });
  }
  return dbPromise;
}

export const dbService = {
  async getPessoas(): Promise<Pessoa[]> {
    const db = await getDB();
    return db.getAll('pessoas');
  },

  async getPessoaById(id: string): Promise<Pessoa | undefined> {
    const db = await getDB();
    return db.get('pessoas', id);
  },

  async getPessoaByCPF(cpf: string): Promise<Pessoa | undefined> {
    const db = await getDB();
    return db.getFromIndex('pessoas', 'cpf', cpf);
  },

  async getPessoaByQRCode(qr_code: string): Promise<Pessoa | undefined> {
    const db = await getDB();
    return db.getFromIndex('pessoas', 'qr_code', qr_code);
  },

  async searchPessoas(query: string): Promise<Pessoa[]> {
    const db = await getDB();
    const all = await db.getAll('pessoas');
    const q = query.toLowerCase();
    return all.filter(p =>
      p.nome?.toLowerCase().includes(q) ||
      p.cpf?.includes(q) ||
      p.placa?.toLowerCase().includes(q)
    );
  },

  async putPessoa(pessoa: Pessoa): Promise<string> {
    const db = await getDB();
    const id = pessoa.id || crypto.randomUUID();
    await db.put('pessoas', { ...pessoa, id });
    return id;
  },

  async deletePessoa(id: string): Promise<void> {
    const db = await getDB();
    await db.delete('pessoas', id);
  },

  async getAcessos(): Promise<Acesso[]> {
    const db = await getDB();
    return db.getAll('acessos');
  },

  async getAcessosByPessoaId(pessoa_id: string): Promise<Acesso[]> {
    const db = await getDB();
    return db.getAllFromIndex('acessos', 'pessoa_id', pessoa_id);
  },

  async getAcessosNaoSincronizados(): Promise<Acesso[]> {
    const db = await getDB();
    const all = await db.getAll('acessos');
    return all.filter(a => a.synced === false);
  },

  async putAcesso(acesso: Acesso): Promise<string> {
    const db = await getDB();
    const id = acesso.id || crypto.randomUUID();
    await db.put('acessos', { ...acesso, id });
    return id;
  },

  async updateAcesso(id: string, data: Partial<Acesso>): Promise<void> {
    const db = await getDB();
    const existing = await db.get('acessos', id);
    if (existing) {
      await db.put('acessos', { ...existing, ...data });
    }
  },

  async getPreCadastrosNaoSincronizados(): Promise<PreCadastroOffline[]> {
    const db = await getDB();
    const all = await db.getAll('pre_cadastros');
    return all.filter(p => p.synced === false);
  },

  async putPreCadastro(preCadastro: PreCadastroOffline): Promise<string> {
    const db = await getDB();
    const id = preCadastro.id || crypto.randomUUID();
    await db.put('pre_cadastros', { ...preCadastro, id });
    return id;
  },

  async markSynced(tableName: 'pessoas' | 'acessos' | 'pre_cadastros', id: string): Promise<void> {
    const db = await getDB();
    const item = await db.get(tableName, id);
    if (item) {
      await db.put(tableName, { ...item, synced: true });
    }
  },

  async clearAll(): Promise<void> {
    const db = await getDB();
    await db.clear('pessoas');
    await db.clear('acessos');
    await db.clear('pre_cadastros');
  },
};
