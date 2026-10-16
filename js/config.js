/* =====================================================================
   CONFIGURAÇÃO — Gestão Inteligente UPA Rocinha
   A chave "anon" do Supabase É PÚBLICA por desenho: quem protege os dados
   são as regras do banco (RLS) — veja supabase/*.sql. Nunca coloque aqui
   a chave "service_role".
   ===================================================================== */
window.UPA_CONFIG = {
  SUPABASE_URL: 'https://nofxatplkkfymibbracm.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5vZnhhdHBsa2tmeW1pYmJyYWNtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIxNTkyMTMsImV4cCI6MjEwNzczNTIxM30.Z2saNqFoBAm-AdnOX11PoS0eVe12hCtxQh1-_XLQJYY',

  // A pessoa entra com a matrícula; por trás ela vira 10344@upa.local.
  // Tem que ser IGUAL ao EMAIL_DOMINIO de scripts/importar_usuarios.mjs.
  EMAIL_DOMINIO: 'upa.local',

  // Minutos parado até sair sozinho (computador compartilhado na unidade). 0 = nunca.
  OCIOSIDADE_MIN: 30,

  // Só para o Chat e o painel "Atendimento" da tela inicial (continuam como estavam).
  APP_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbxf7lO2kgVH0tvidjJohzkobFUDMuaqYhJI6GYjDhBDq8qHv-08HL7KqAjbkkhq-Cr4Bg/exec'
};
