import { supabase } from './supabaseClient';

const authProvider = import.meta.env.VITE_SUPABASE_AUTH_PROVIDER || 'email';
const storageBucket = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'public';
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || '';

const buildApiUrl = (path) => {
  if (!path.startsWith('/')) {
    return `${apiBaseUrl}/${path}`;
  }
  return `${apiBaseUrl}${path}`;
};

const toSnakeCase = (value) =>
  value
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/\s+/g, '_')
    .toLowerCase();

const tableMap = {
  User: 'profiles',
  Household: 'households',
  HouseholdMember: 'household_members',
  Receipt: 'receipts',
  CreditLog: 'credit_logs',
  MealPlan: 'meal_plans',
  Recipe: 'recipes',
  RecipeNote: 'recipe_notes',
  IngredientMap: 'ingredient_maps',
  NutritionFact: 'nutrition_facts',
  FailedNutritionLookup: 'failed_nutrition_lookups',
  Invitation: 'invitations',
  Budget: 'budgets'
};

const getTableName = (entityName) => {
  if (tableMap[entityName]) {
    return tableMap[entityName];
  }
  const base = toSnakeCase(entityName);
  return base.endsWith('s') ? base : `${base}s`;
};

const applyFilters = (queryBuilder, filters) => {
  if (!filters || typeof filters !== 'object') {
    return queryBuilder;
  }
  return Object.entries(filters).reduce((builder, [key, value]) => {
    if (Array.isArray(value)) {
      return builder.in(key, value);
    }
    if (value === null) {
      return builder.is(key, null);
    }
    return builder.eq(key, value);
  }, queryBuilder);
};

const applySort = (queryBuilder, sort) => {
  if (!sort || typeof sort !== 'string') {
    return queryBuilder;
  }
  const direction = sort.startsWith('-') ? 'desc' : 'asc';
  const column = sort.replace(/^-/, '');
  return queryBuilder.order(column, { ascending: direction === 'asc' });
};

const createEntityApi = (entityName) => {
  const table = getTableName(entityName);
  return {
    async list(filters = {}, limit = 1000) {
      let query = supabase.from(table).select('*');
      query = applyFilters(query, filters);
      if (limit) {
        query = query.limit(limit);
      }
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return data;
    },
    async filter(filters = {}, sort, limit = 1000) {
      let query = supabase.from(table).select('*');
      query = applyFilters(query, filters);
      query = applySort(query, sort);
      if (limit) {
        query = query.limit(limit);
      }
      const { data, error } = await query;
      if (error) {
        throw error;
      }
      return data;
    },
    async create(payload) {
      const { data, error } = await supabase.from(table).insert(payload).select('*').single();
      if (error) {
        throw error;
      }
      return data;
    },
    async update(id, payload) {
      const { data, error } = await supabase.from(table).update(payload).eq('id', id).select('*').single();
      if (error) {
        throw error;
      }
      return data;
    }
  };
};

const entities = new Proxy(
  {},
  {
    get(_target, prop) {
      if (prop === 'Query') {
        return {};
      }
      if (typeof prop === 'string') {
        return createEntityApi(prop);
      }
      return undefined;
    }
  }
);

const getProfile = async (userId) => {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) {
    return null;
  }
  return data;
};

const auth = {
  async me() {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    const user = data?.user || null;
    if (!user) {
      return null;
    }
    const profile = await getProfile(user.id);
    return profile ? { ...user, ...profile } : user;
  },
  async isAuthenticated() {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      throw error;
    }
    return Boolean(data?.session);
  },
  async redirectToLogin(redirectTo) {
    // Avoid hard redirecting to a disabled OAuth provider (which can render raw JSON errors).
    // We route users to the in-app auth screen instead.
    const target = new URL('/dashboard', window.location.origin);
    if (redirectTo) {
      target.searchParams.set('next', redirectTo);
    }
    target.searchParams.set('auth', authProvider === 'email' ? 'email' : 'fallback');
    window.location.assign(target.toString());
  },
  async signInWithPassword({ email, password }) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  },
  async signUpWithPassword({ email, password }) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return data;
  },
  async updateMe(updates) {
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      throw error;
    }
    const user = data?.user;
    if (!user) {
      throw new Error('No authenticated user');
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select('*')
      .single();
    if (profileError) {
      throw profileError;
    }
    return { ...user, ...profile };
  }
};

const invokeFunction = async (name, payload) => {
  const { data, error } = await supabase.functions.invoke(name, { body: payload });
  if (error) {
    throw error;
  }
  return data;
};

const integrations = {
  Core: {
    async InvokeLLM(payload) {
      const response = await fetch(buildApiUrl('/api/llm/receipt'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      });
      if (!response.ok) {
        throw new Error('LLM request failed');
      }
      return response.json();
    },
    async SendEmail(payload) {
      // TODO: Implement email endpoint in API project.
      const response = await fetch(buildApiUrl('/api/email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      });
      if (!response.ok) {
        return { ok: false };
      }
      return response.json();
    },
    async SendSMS(payload) {
      // TODO: Implement SMS endpoint in API project.
      const response = await fetch(buildApiUrl('/api/sms'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      });
      if (!response.ok) {
        return { ok: false };
      }
      return response.json();
    },
    async UploadFile({ file, path }) {
      if (!file) {
        throw new Error('File is required');
      }
      const filePath = path || `${Date.now()}_${file.name}`;
      const { data, error } = await supabase.storage.from(storageBucket).upload(filePath, file);
      if (error) {
        throw error;
      }
      const { data: publicUrl } = supabase.storage.from(storageBucket).getPublicUrl(data.path);
      return { path: data.path, publicUrl: publicUrl?.publicUrl };
    },
    async GenerateImage(payload) {
      // TODO: Implement image generation endpoint in API project.
      const response = await fetch(buildApiUrl('/api/images'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      });
      if (!response.ok) {
        return { ok: false };
      }
      return response.json();
    },
    async ExtractDataFromUploadedFile(payload) {
      const response = await fetch(buildApiUrl('/api/ocr/textract'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      });
      if (!response.ok) {
        throw new Error('OCR request failed');
      }
      return response.json();
    }
  }
};

const appLogs = {
  async logUserInApp() {
    return true;
  }
};

export const appClient = {
  auth,
  entities,
  functions: { invoke: invokeFunction },
  integrations,
  appLogs,
  asServiceRole: {
    entities,
    functions: { invoke: invokeFunction },
    integrations
  }
};
