// =====================================================
// SUPABASE EDGE FUNCTION: admin-users
// =====================================================
// 
// INSTRUÇÕES PARA DEPLOY:
// 
// 1. Acesse o Supabase Dashboard: https://supabase.com/dashboard
// 2. Selecione seu projeto
// 3. Vá em "Edge Functions" no menu lateral
// 4. Clique em "Create a new function"
// 5. Nome: admin-users
// 6. Cole este código no editor
// 7. Clique em "Deploy"
// 
// IMPORTANTE: Após deploy, a URL será algo como:
// https://SEU_PROJECT_ID.supabase.co/functions/v1/admin-users
//
// =====================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verifica autenticação do admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Cria cliente Supabase com service role (para operações admin)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    )

    // Cria cliente com token do usuário para verificar se é admin
    const supabaseUser = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { headers: { Authorization: authHeader } },
        auth: { persistSession: false }
      }
    )

    // Verifica se o usuário atual é admin
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: profile } = await supabaseUser
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Only admins can manage users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse da URL para determinar a ação
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()
    const body = await req.json()

    // =====================================================
    // AÇÃO: CRIAR USUÁRIO
    // =====================================================
    if (action === 'create' && req.method === 'POST') {
      const { email, password, name, role, visible_qualifications } = body

      if (!email || !password || !name) {
        return new Response(
          JSON.stringify({ error: 'Email, password and name are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Cria usuário no Auth
      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Confirma email automaticamente
      })

      if (authError) {
        return new Response(
          JSON.stringify({ error: authError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Cria ou atualiza profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .upsert({
          id: authData.user.id,
          name,
          email,
          role: role || 'sdr',
          visible_qualifications: visible_qualifications || ['RUIM', 'MEDIO', 'QUALIFICADO', 'ULTRA'],
        })

      if (profileError) {
        // Rollback: deleta usuário se profile falhou
        await supabaseAdmin.auth.admin.deleteUser(authData.user.id)
        return new Response(
          JSON.stringify({ error: profileError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, user: { id: authData.user.id, email, name } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =====================================================
    // AÇÃO: DELETAR USUÁRIO
    // =====================================================
    if (action === 'delete' && req.method === 'POST') {
      const { userId } = body

      if (!userId) {
        return new Response(
          JSON.stringify({ error: 'userId is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Não permite deletar a si mesmo
      if (userId === user.id) {
        return new Response(
          JSON.stringify({ error: 'Cannot delete yourself' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Deleta profile primeiro
      await supabaseAdmin.from('profiles').delete().eq('id', userId)

      // Deleta usuário do Auth
      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId)

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =====================================================
    // AÇÃO: RESET DE SENHA
    // =====================================================
    if (action === 'reset-password' && req.method === 'POST') {
      const { email } = body

      if (!email) {
        return new Response(
          JSON.stringify({ error: 'email is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(email)

      if (resetError) {
        return new Response(
          JSON.stringify({ error: resetError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Password reset email sent' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // =====================================================
    // AÇÃO: ALTERAR SENHA DIRETAMENTE (sem email)
    // =====================================================
    if (action === 'change-password' && req.method === 'POST') {
      const { userId, newPassword } = body

      if (!userId || !newPassword) {
        return new Response(
          JSON.stringify({ error: 'userId and newPassword are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (newPassword.length < 6) {
        return new Response(
          JSON.stringify({ error: 'Password must be at least 6 characters' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      )

      if (updateError) {
        return new Response(
          JSON.stringify({ error: updateError.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Password changed successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Unknown action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
