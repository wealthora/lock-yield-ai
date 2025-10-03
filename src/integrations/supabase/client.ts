import { createClient } from '@supabase/supabase-js';

// These values are auto-injected by Lovable Cloud
const supabaseUrl = "https://nhxcsxhxbsnhqyblxdxj.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5oeGNzeGh4YnNuaHF5Ymx4ZHhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzU4MjM1ODIsImV4cCI6MjA1MTM5OTU4Mn0.k3FT3xPqH2k6uR4kXElqVrE1lFRxhD_zXAR3HF3RhD0";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
