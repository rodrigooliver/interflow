/*
  # Initial Schema Setup for Chat System

  1. New Tables
    - profiles (user profiles for agents)
    - customers (customer information)
    - chats (chat sessions)
    - messages (chat messages)
    - automations (automation rules)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'agent')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create customers table
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  instagram_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  last_contact TIMESTAMPTZ DEFAULT now()
);

-- Create chats table
CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES customers(id),
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  channel TEXT NOT NULL CHECK (channel IN ('whatsapp', 'instagram', 'web')),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  assigned_to UUID REFERENCES profiles(id)
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID REFERENCES chats(id),
  content TEXT NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system')),
  sender_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Agents can read all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Agents can read all customers"
  ON customers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Agents can create customers"
  ON customers FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Agents can read all chats"
  ON chats FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Agents can create and update chats"
  ON chats FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Agents can read all messages"
  ON messages FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Agents can create messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (true);