import { registerTranslations } from "./i18n";

// Tradução PT -> EN. A chave é o texto português tal como aparece no código.
registerTranslations({
  // Comuns / mensagens
  "Preenche os campos obrigatórios.": "Fill in the required fields.",
  "Escolhe um tipo de utilizador válido.": "Choose a valid user type.",
  "Já existe uma conta com estes dados.":
    "An account with these details already exists.",
  "Email ou palavra-passe inválidos.": "Invalid email or password.",
  "Existem campos com formato inválido.":
    "Some fields have an invalid format.",
  "A palavra-passe deve ter pelo menos 8 caracteres.":
    "The password must be at least 8 characters.",
  "Esta ligação de recuperação é inválida ou expirou. Pede uma nova.":
    "This reset link is invalid or has expired. Request a new one.",
  "Demasiadas tentativas. Tenta novamente mais tarde.":
    "Too many attempts. Please try again later.",
  "Ocorreu um erro. Tenta novamente.": "An error occurred. Please try again.",
  "Não foi possível ligar ao servidor.": "Could not connect to the server.",
  "Se existir uma conta com esse email, enviámos instruções para recuperar a palavra-passe.":
    "If an account exists for that email, we've sent password recovery instructions.",
  "Palavra-passe alterada com sucesso. Já podes entrar.":
    "Password changed successfully. You can now sign in.",
  "A tua sessão expirou. Entra novamente.":
    "Your session has expired. Please sign in again.",
  "Conta criada com sucesso. Agora já podes entrar.":
    "Account created successfully. You can now sign in.",
  "Conta eliminada com sucesso.": "Account deleted successfully.",
  "A carregar…": "Loading…",

  // Login
  "A tua vontade, com clareza e segurança.":
    "Your wishes, with clarity and security.",
  "Uma plataforma simples para consultar diretivas, decisões e documentos de saúde.":
    "A simple platform to view directives, decisions and health documents.",
  "Na plataforma encontras": "On the platform you'll find",
  "Clareza para registar a tua vontade": "Clarity to record your wishes",
  "Partilha segura com quem te acompanha":
    "Secure sharing with those who care for you",
  "Informação acessível quando for precisa":
    "Accessible information when it's needed",
  Entrar: "Sign in",
  Email: "Email",
  "nome@exemplo.pt": "name@example.com",
  "Palavra-passe": "Password",
  "Introduz a tua palavra-passe": "Enter your password",
  "Histórico de emails": "Email history",
  "Ainda não tens conta?": "Don't have an account yet?",
  "Regista-te": "Sign up",
  "Esqueceste-te da palavra-passe?": "Forgot your password?",

  // Recuperar palavra-passe
  "Recuperar o acesso à tua conta.": "Recover access to your account.",
  "Indica o teu email e enviamos as instruções para definires uma nova palavra-passe.":
    "Enter your email and we'll send instructions to set a new password.",
  "Recuperar palavra-passe": "Reset password",
  "A enviar...": "Sending...",
  "Enviar instruções": "Send instructions",
  "Lembraste-te?": "Remembered it?",
  "Voltar a entrar": "Back to sign in",

  // Redefinir palavra-passe
  "Definir uma nova palavra-passe.": "Set a new password.",
  "Escolhe uma palavra-passe segura para voltares a aceder à tua conta.":
    "Choose a secure password to access your account again.",
  "Nova palavra-passe": "New password",
  "Ligação inválida. Pede uma nova recuperação de palavra-passe.":
    "Invalid link. Request a new password reset.",
  "Pelo menos 8 caracteres": "At least 8 characters",
  "Confirmar palavra-passe": "Confirm password",
  "Repete a palavra-passe": "Repeat the password",
  "A guardar...": "Saving...",
  "Guardar nova palavra-passe": "Save new password",
  "As palavras-passe não coincidem.": "The passwords don't match.",

  // Perfis (rótulos)
  Paciente: "Patient",
  Médico: "Doctor",
  Cuidador: "Caregiver",
  Utilizador: "User",

  // Registo (signup)
  Registo: "Sign up",
  "Escolhe o perfil com que te queres registar.":
    "Choose the profile you want to register with.",
  "Perfil selecionado": "Selected profile",
  "Alterar perfil": "Change profile",
  Nome: "Name",
  "Nome completo": "Full name",
  "nome@gmail.com": "name@gmail.com",
  "Cria uma palavra-passe": "Create a password",
  "A palavra-passe deve ter:": "The password must have:",
  "Pelo menos 1 letra maiúscula": "At least 1 uppercase letter",
  "Pelo menos 1 letra minúscula": "At least 1 lowercase letter",
  "Pelo menos 1 número": "At least 1 number",
  "Informação do paciente": "Patient information",
  "Número de utente": "Patient number",
  "Data de nascimento": "Date of birth",
  Telefone: "Phone",
  "Informação profissional": "Professional information",
  "Cédula profissional": "Professional license",
  Especialidade: "Specialty",
  "Informação do cuidador": "Caregiver information",
  "Relação com o utente": "Relationship to the patient",
  "Ex.: Familiar direto": "e.g. Immediate family",
  Obrigatório: "Required",
  "Email inválido": "Invalid email",
  "Palavra-passe inválida": "Invalid password",
  "Deve ter 9 dígitos": "Must be 9 digits",
  "Deve ter 4 a 6 dígitos": "Must be 4 to 6 digits",
  "Criar conta": "Create account",
  "Já tens conta?": "Already have an account?",

  // Início do paciente
  "Olá, {name}": "Hello, {name}",
  Reanimação: "Resuscitation",
  "Alimentação artificial": "Artificial feeding",
  "Quero sentir menos dor ou ficar mais alerta?":
    "Do I want to feel less pain or stay more alert?",
  "Por definir": "Not set",
  Definida: "Set",
  Pendente: "Pending",
  "Decisões principais": "Main decisions",
  "O que falta tratar": "What's left to do",
  "Quem tem acesso": "Who has access",
  "Cuidadores ativos": "Active caregivers",
  "Convites pendentes": "Pending invitations",
  "Médicos ligados": "Connected doctors",
  "Últimas atualizações": "Latest updates",
  "Diretivas definidas": "Directives set",
  "Último documento": "Latest document",
  "Última ligação": "Latest connection",
  Ativo: "Active",
  Contacto: "Contact",
  "Email por definir": "Email not set",
  "Telefone por definir": "Phone not set",
  "Relação contigo": "Relationship to you",
  "Ligação ativa desde": "Active connection since",
  "Agora mesmo": "Just now",
  "Mais informação": "More information",
  "Sem cuidador associado": "No caregiver linked",
  "Por ligar": "Not linked",
  Estado: "Status",
  "Convite pendente": "Pending invitation",
  "Próximo passo": "Next step",
  "Abrir a área do cuidador": "Open the caregiver area",
  Cédula: "License",
  "Sem médico associado": "No doctor linked",
  "Sem ligação": "No connection",
  "Sem médico ligado": "No doctor connected",
  "Abrir a área do médico": "Open the doctor area",
  Informação: "Information",
  "O convite foi enviado e está à espera de aceitação.":
    "The invitation was sent and is awaiting acceptance.",
  "Os dados do médico vão aparecer aqui":
    "The doctor's details will appear here",
  "Ainda não existem diretivas principais definidas.":
    "No main directives have been set yet.",
  "Faltam {count} diretivas por completar.":
    "{count} directives left to complete.",
  "Ainda não tens documentos carregados.":
    "You haven't uploaded any documents yet.",
  "Ainda não existe cuidador associado.": "No caregiver linked yet.",
  "Existe 1 convite de cuidador pendente.":
    "There is 1 pending caregiver invitation.",
  "Existem {count} convites de cuidador pendentes.":
    "There are {count} pending caregiver invitations.",
  "Existe 1 convite de médico pendente.":
    "There is 1 pending doctor invitation.",
  "Existem {count} convites de médico pendentes.":
    "There are {count} pending doctor invitations.",
  "Existe mais 1 cuidador ativo.": "There is 1 more active caregiver.",
  "Existem mais {count} cuidadores ativos.":
    "There are {count} more active caregivers.",
  "Existe mais 1 médico ativo.": "There is 1 more active doctor.",
  "Existem mais {count} médicos ativos.":
    "There are {count} more active doctors.",
  "Sem registo": "No record",

  // Decisões
  "As Minhas Decisões": "My Decisions",
  "Diretivas principais": "Main directives",
  "A carregar as tuas decisões atuais...": "Loading your current decisions...",
  "Notas opcionais": "Optional notes",
  "Se quiseres, podes acrescentar uma nota.":
    "If you'd like, you can add a note.",
  "Guardar decisões": "Save decisions",
  "Resumo atual": "Current summary",
  Preenchidas: "Completed",
  "{count} de 3": "{count} of 3",
  "Seleciona uma opção": "Select an option",
  "Tentar reanimação": "Attempt resuscitation",
  "Não reanimar": "Do not resuscitate",
  "Aceitar apoio": "Accept support",
  "Recusar apoio": "Decline support",
  "Sentir menos dor, mesmo com mais sonolência":
    "Feel less pain, even with more drowsiness",
  "Ficar mais alerta, mesmo com algum desconforto":
    "Stay more alert, even with some discomfort",
  "Preenche as decisões principais antes de guardar.":
    "Fill in the main decisions before saving.",
  "Esta área está disponível apenas para pacientes.":
    "This area is available to patients only.",
  "Não foi possível encontrar estas diretivas.":
    "These directives could not be found.",
  "Não foi possível carregar as tuas decisões.":
    "Could not load your decisions.",
  "Revê os campos assinalados antes de guardar.":
    "Review the highlighted fields before saving.",
  "Decisões guardadas com sucesso.": "Decisions saved successfully.",
  "Não foi possível guardar as tuas decisões.":
    "Could not save your decisions.",

  // Documentos
  "Adicionar documento": "Add document",
  "A carregar os documentos atuais...": "Loading current documents...",
  Título: "Title",
  "Tipo de documento": "Document type",
  Ficheiro: "File",
  "Escolher ficheiro": "Choose file",
  "Nenhum ficheiro selecionado": "No file selected",
  "Guardar documento": "Save document",
  Total: "Total",
  "1 documento": "1 document",
  "{count} documentos": "{count} documents",
  "Último registo": "Latest entry",
  "Sem documentos": "No documents",
  "Ainda não existem documentos registados nesta área.":
    "No documents recorded in this area yet.",
  "Registado a {date}": "Recorded on {date}",
  "A descarregar...": "Downloading...",
  Descarregar: "Download",
  "A remover...": "Removing...",
  Remover: "Remove",
  "Max. 10 MB": "Max. 10 MB",
  "Sem data": "No date",
  "Testamento vital": "Living will",
  "Diretiva legal": "Legal directive",
  "Relatório clínico": "Clinical report",
  Autorização: "Authorization",
  Outro: "Other",
  "Indica o título e seleciona um ficheiro antes de guardar.":
    "Enter a title and select a file before saving.",
  "Seleciona um PDF, Word, texto ou imagem suportada.":
    "Select a supported PDF, Word, text or image file.",
  "O ficheiro tem de ter no máximo 10 MB.":
    "The file must be at most 10 MB.",
  "Seleciona um ficheiro até 10 MB.": "Select a file up to 10 MB.",
  "Não foi possível encontrar estes documentos.":
    "These documents could not be found.",
  "Não foi possível encontrar este documento.":
    "This document could not be found.",
  "O ficheiro deste documento já não está disponível.":
    "This document's file is no longer available.",
  "Não tens permissão para abrir este documento.":
    "You don't have permission to open this document.",
  "Não foi possível carregar os teus documentos.":
    "Could not load your documents.",
  "Documento guardado com sucesso.": "Document saved successfully.",
  "Não foi possível guardar este documento.":
    "Could not save this document.",
  "Não foi possível descarregar este documento.":
    "Could not download this document.",
  "Documento removido com sucesso.": "Document removed successfully.",
  "Não foi possível remover este documento.":
    "Could not remove this document.",

  // Ciclo de vida da diretiva (DAV)
  "Estado da diretiva": "Directive status",
  "Rascunho — ainda não registada": "Draft — not yet registered",
  Ativa: "Active",
  "A caducar": "Expiring soon",
  Caducada: "Expired",
  "Alterada após o registo": "Changed after registration",
  Revogada: "Revoked",
  "Ainda não registaste esta diretiva no RENTEV.":
    "You haven't registered this directive with RENTEV yet.",
  "Esta diretiva foi revogada.": "This directive has been revoked.",
  "A validade caducou. Renova a diretiva no RENTEV.":
    "The validity has expired. Renew the directive with RENTEV.",
  "Alteraste as decisões após o registo. Considera re-registar no RENTEV.":
    "You changed the decisions after registration. Consider re-registering with RENTEV.",
  "Caduca em {count} dias. Considera renovar no RENTEV.":
    "Expires in {count} days. Consider renewing with RENTEV.",
  "Válida até {date}.": "Valid until {date}.",
  "Data de assinatura": "Signature date",
  "Válida até": "Valid until",
  "Data de assinatura/registo no RENTEV":
    "Signature/registration date with RENTEV",
  "Registar assinatura": "Register signature",
  "A gerar...": "Generating...",
  "Descarregar PDF": "Download PDF",
  "A revogar...": "Revoking...",
  "Revogar diretiva": "Revoke directive",
  "A MyVontade ajuda-te a preparar e organizar a tua diretiva, mas não é o registo legal. O registo oficial é feito no RENTEV.":
    "MyVontade helps you prepare and organize your directive, but it is not the legal registry. Official registration is done with RENTEV.",
  "Registo guardado com sucesso.": "Registration saved successfully.",
  "Diretiva revogada.": "Directive revoked.",
  "Não foi possível gerar o PDF.": "Could not generate the PDF.",
  "Indica uma data de assinatura válida.":
    "Enter a valid signature date.",
  "A data de assinatura não pode ser no futuro.":
    "The signature date cannot be in the future.",
  "Define e guarda as decisões antes de registar.":
    "Define and save the decisions before registering.",
  "Não há uma diretiva ativa para revogar.":
    "There is no active directive to revoke.",

  // Registo de acessos
  "Registo de acessos": "Access log",
  "Quem consultou ou descarregou os teus dados, e quando.":
    "Who viewed or downloaded your data, and when.",
  "A carregar o registo...": "Loading the log...",
  "Não foi possível carregar o registo de acessos.":
    "Could not load the access log.",
  "Ainda ninguém acedeu aos teus dados.":
    "No one has accessed your data yet.",
  Desconhecido: "Unknown",
  "Consultou os teus dados": "Viewed your data",
  'Descarregou o documento "{name}"': 'Downloaded the document "{name}"',
  "Descarregou um documento": "Downloaded a document",
  "Utilizador removido": "Removed user",

  // Paciente: ligações com cuidadores
  "Ligações com cuidadores": "Caregiver links",
  "Ligações atuais": "Current links",
  "A carregar ligações atuais...": "Loading current links...",
  "Convidar cuidador": "Invite caregiver",
  "Envia um convite e define as áreas que o cuidador vai poder consultar.":
    "Send an invitation and choose the areas the caregiver will be able to view.",
  "Fechar formulário": "Close form",
  "Email da conta do cuidador": "Caregiver account email",
  "Relação com o paciente": "Relationship to the patient",
  "Áreas que queres partilhar": "Areas you want to share",
  "O cuidador precisa de ter uma conta criada com o perfil `cuidador` para poderes enviar o convite.":
    "The caregiver needs an account with the 'caregiver' profile before you can send the invitation.",
  "Enviar convite": "Send invitation",
  "Escolhe pelo menos uma opção": "Choose at least one option",
  "Relação:": "Relationship:",
  "Telefone:": "Phone:",
  "Alterar permissões": "Change permissions",
  "Guardar permissões": "Save permissions",
  Cancelar: "Cancel",
  "A cancelar...": "Cancelling...",
  "Cancelar convite": "Cancel invitation",
  "Remover ligação": "Remove link",
  "Convite enviado em {date}.": "Invitation sent on {date}.",
  "Ligação aceite em {date}.": "Link accepted on {date}.",
  "Ainda sem cuidadores ligados": "No caregivers linked yet",
  "Quando um cuidador aceitar o teu convite, a ligação vai aparecer aqui.":
    "When a caregiver accepts your invitation, the link will appear here.",
  "Não foi possível carregar as ligações com cuidadores.":
    "Could not load caregiver links.",
  "Revê os campos assinalados antes de enviar o convite.":
    "Review the highlighted fields before sending the invitation.",
  "Convite enviado com sucesso. O cuidador vai ter de o aceitar.":
    "Invitation sent successfully. The caregiver will need to accept it.",
  "Não foi possível enviar o convite ao cuidador.":
    "Could not send the invitation to the caregiver.",
  "Ligação removida com sucesso.": "Link removed successfully.",
  "Não foi possível atualizar esta ligação.":
    "Could not update this link.",
  "Permissões atualizadas com sucesso.":
    "Permissions updated successfully.",
  "Não foi possível atualizar as permissões desta ligação.":
    "Could not update this link's permissions.",

  // Paciente: ligações com médicos
  "Ligações com Médicos": "Doctor links",
  "Convidar médico": "Invite doctor",
  "Envia um convite e escolhe exatamente o que queres partilhar com o médico.":
    "Send an invitation and choose exactly what you want to share with the doctor.",
  "Email da conta do médico": "Doctor account email",
  "O médico precisa de ter uma conta criada com o perfil `médico` para poderes enviar o convite.":
    "The doctor needs an account with the 'doctor' profile before you can send the invitation.",
  "Especialidade:": "Specialty:",
  "Cédula:": "License:",
  "Ainda sem médicos ligados": "No doctors linked yet",
  "Quando um médico aceitar o teu convite, a ligação vai aparecer aqui.":
    "When a doctor accepts your invitation, the link will appear here.",
  "Não foi possível carregar as ligações com médicos.":
    "Could not load doctor links.",
  "Convite enviado com sucesso. O médico vai ter de o aceitar.":
    "Invitation sent successfully. The doctor will need to accept it.",
  "Não foi possível enviar o convite ao médico.":
    "Could not send the invitation to the doctor.",
  "Esta área está disponível apenas para médicos.":
    "This area is available to doctors only.",
  "Não encontrámos um médico com esse email. O médico precisa de ter conta criada.":
    "We couldn't find a doctor with that email. The doctor needs to have an account.",
  "Esse médico já está ligado ao teu perfil.":
    "That doctor is already linked to your profile.",
  "Escolhe pelo menos uma área para partilhar com o médico.":
    "Choose at least one area to share with the doctor.",
  "Preenche o email do médico antes de enviar o convite.":
    "Enter the doctor's email before sending the invitation.",

  // Home do cuidador/médico
  "Pacientes ativos": "Active patients",
  "Áreas partilhadas": "Shared areas",
  "Não partilhada": "Not shared",
  "Acesso ativo desde": "Active access since",
  "Acessos recebidos": "Access received",
  "Pacientes com acesso ativo": "Patients with active access",
  "Último acesso aceite": "Latest access accepted",
  "Último convite recebido": "Latest invitation received",
  "Paciente mais recente": "Most recent patient",
  "Convites por aceitar": "Invitations to accept",
  "O paciente não partilhou a área de informação.":
    "The patient hasn't shared the information area.",
  "Pedido enviado em {date}": "Request sent on {date}",
  "A aceitar...": "Accepting...",
  "Aceitar convite": "Accept invitation",
  "Ainda sem pacientes ligados": "No patients linked yet",
  "Quando um paciente aceitar partilhar acesso contigo, o nome dele vai aparecer na área":
    "When a patient accepts sharing access with you, their name will appear in the",
  "do menu.": "menu area.",
  "A carregar": "Loading",
  "Estamos a preparar as ligações deste perfil.":
    "We're preparing this profile's links.",
  "Ligação aceite com sucesso.": "Link accepted successfully.",
  "Não foi possível aceitar este convite.":
    "Could not accept this invitation.",
  "Não foi possível carregar os pacientes ligados a este perfil.":
    "Could not load the patients linked to this profile.",

  // Home do médico
  "Diretivas visíveis": "Visible directives",
  "Documentos visíveis": "Visible documents",
  "Último paciente": "Latest patient",
  "Último acesso": "Latest access",
  "Último convite": "Latest invitation",
  "Não partilhado": "Not shared",
  "Áreas visíveis": "Visible areas",
  "Existe mais 1 paciente ativo.": "There is 1 more active patient.",
  "Existem mais {count} pacientes ativos.":
    "There are {count} more active patients.",
  "Existe 1 convite pendente.": "There is 1 pending invitation.",
  "Existem {count} convites pendentes.":
    "There are {count} pending invitations.",
  "Sem pacientes ligados": "No patients linked",
  "Tens convites por aceitar": "You have invitations to accept",
  "Ainda não tens acessos ativos": "You don't have active access yet",
  "Quando aparecer": "When it appears",
  "Quando um paciente partilhar acesso contigo":
    "When a patient shares access with you",
  "Vais ver": "You'll see",
  "Diretivas, documentos e informação clínica":
    "Directives, documents and clinical information",
  "Conta profissional": "Professional account",
  Pronto: "Ready",
  "Por rever": "Needs review",
  "A carregar...": "Loading...",
  "Perfil por completar": "Profile incomplete",
  "Confirma a tua cédula, especialidade e telefone para deixares o perfil profissional pronto.":
    "Confirm your license, specialty and phone to finish setting up your professional profile.",
  "Abrir conta": "Open account",
  "Não foi possível carregar a informação profissional deste perfil.":
    "Could not load this profile's professional information.",
  "Não foi possível carregar a informação profissional.":
    "Could not load the professional information.",

  // Cuidador/médico: ver pacientes
  "Ligações com pacientes": "Patient links",
  "Área dos pacientes": "Patients area",
  "Ainda não tens pacientes ativos. Primeiro aceita os convites na página inicial do cuidador.":
    "You don't have active patients yet. First accept the invitations on the caregiver home page.",
  "Quando tiveres um paciente com acesso ativo, ele vai aparecer aqui para consultares apenas as áreas que ele partilhou contigo.":
    "When you have a patient with active access, they'll appear here so you can view only the areas they've shared with you.",
  "Seleciona um paciente para abrir a informação partilhada.":
    "Select a patient to open the shared information.",
  "Navegação do paciente selecionado": "Selected patient navigation",
  "Menu do paciente": "Patient menu",
  "A carregar os dados partilhados do paciente selecionado...":
    "Loading the selected patient's shared data...",
  Notas: "Notes",
  "Notas registadas": "Recorded notes",
  "Não existem notas adicionais.": "There are no additional notes.",
  "Este paciente ainda não carregou documentos nesta área.":
    "This patient hasn't uploaded any documents in this area yet.",
  "Documento geral": "General document",
  Partilhado: "Shared",
  "Ficheiro:": "File:",
  "Carregado em {date}": "Uploaded on {date}",
  "Descarregar documento": "Download document",
  "Estamos a preparar os pacientes ligados a este perfil.":
    "We're preparing the patients linked to this profile.",
  "Não foi possível carregar o resumo do paciente.":
    "Could not load the patient's summary.",
  "Ainda não tens pacientes ativos. Primeiro aceita os convites na página inicial do médico.":
    "You don't have active patients yet. First accept the invitations on the doctor home page.",
  "Documento descarregado com sucesso.": "Document downloaded successfully.",

  // Permissões / ligações (partilhado cuidador/médico)
  Ligado: "Linked",
  "Esta área está disponível apenas para cuidadores.":
    "This area is available to caregivers only.",
  "Não encontrámos um cuidador com esse email. O cuidador precisa de ter conta criada.":
    "We couldn't find a caregiver with that email. The caregiver needs to have an account.",
  "Esse cuidador já está ligado ao teu perfil.":
    "That caregiver is already linked to your profile.",
  "Não foi possível encontrar este convite.":
    "This invitation could not be found.",
  "Só podes ver pacientes com ligação ativa ao teu perfil.":
    "You can only view patients with an active link to your profile.",
  "Não foi possível encontrar este utilizador.":
    "This user could not be found.",
  "Preenche o email do cuidador e a relação antes de enviar o convite.":
    "Enter the caregiver's email and relationship before sending the invitation.",
  "Revê o email indicado antes de continuar.":
    "Check the email provided before continuing.",
  "Escolhe pelo menos uma área para partilhar com o cuidador.":
    "Choose at least one area to share with the caregiver.",
  "Não foi possível encontrar essa ligação.":
    "That link could not be found.",
  "Email, telefone, número de utente e data de nascimento.":
    "Email, phone, patient number and date of birth.",
  "Dados pessoais do paciente.": "Patient's personal data.",
  "Diretivas principais e notas registadas.":
    "Main directives and recorded notes.",
  "Diretivas e notas registadas.": "Directives and recorded notes.",
  "Ficheiros carregados e respetivo descarregamento.":
    "Uploaded files and their download.",
  "Ficheiros carregados.": "Uploaded files.",

  // Conta
  "A Minha Conta": "My Account",
  "Informação pessoal": "Personal information",
  "Dados do perfil": "Profile data",
  "Eliminar conta": "Delete account",
  "A carregar os dados atuais da conta...":
    "Loading the current account data...",
  "Guardar alterações": "Save changes",
  Editar: "Edit",
  "Navegação da conta": "Account navigation",
  "Voltar ao início": "Back to home",
  "Foto de perfil de {name}": "Profile photo of {name}",
  "Esta ação remove a tua conta e os dados associados de forma permanente.":
    "This action permanently removes your account and associated data.",
  "Antes de apagar tudo, vamos pedir uma confirmação e a tua palavra-passe por segurança.":
    "Before deleting everything, we'll ask for a confirmation and your password for security.",
  "Tens a certeza?": "Are you sure?",
  "Se continuares, a tua conta e todos os dados associados vão ser removidos de forma permanente.":
    "If you continue, your account and all associated data will be permanently removed.",
  "Sim, continuar": "Yes, continue",
  "Não foi possível encontrar esta ligação.": "This link could not be found.",
  "Por segurança, precisamos da tua palavra-passe antes de apagar a conta.":
    "For security, we need your password before deleting the account.",
  Voltar: "Back",
  "A eliminar...": "Deleting...",
  "Preenche os campos obrigatórios antes de guardar.":
    "Fill in the required fields before saving.",
  "Já existe uma conta com este email.":
    "An account with this email already exists.",
  "Não foi possível encontrar esta conta.":
    "This account could not be found.",
  "Introduz a tua palavra-passe para continuar.":
    "Enter your password to continue.",
  "A palavra-passe introduzida não está correta.":
    "The password entered is not correct.",
  "Não foi possível eliminar a conta. Tenta novamente.":
    "Could not delete the account. Please try again.",
  "Não foi possível carregar os dados da conta.":
    "Could not load the account data.",
  "Alterações guardadas com sucesso.": "Changes saved successfully.",
  "Não foi possível guardar as alterações.":
    "Could not save the changes.",
  "Seleciona um ficheiro de imagem válido.":
    "Select a valid image file.",
  "Não foi possível atualizar a foto de perfil.":
    "Could not update the profile photo.",
  "Não foi possível eliminar a conta.": "Could not delete the account.",

  // Navegação
  "Abrir menu de navegação": "Open navigation menu",
  "Terminar sessão": "Sign out",
  "Navegação do paciente": "Patient navigation",
  "Navegação do cuidador": "Caregiver navigation",
  "Navegação do médico": "Doctor navigation",
  Início: "Home",
  Decisões: "Decisions",
  Documentos: "Documents",
  Acessos: "Access log",
  Conta: "Account",
  Pacientes: "Patients",

  // Seletor de idioma
  Idioma: "Language",
});
