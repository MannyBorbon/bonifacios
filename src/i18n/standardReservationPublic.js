/** /reservacion — copy + validation messages (public). */

export const standardReservationPublic = {
  es: {
    badge: 'Reserva general',
    title: 'Reserva tu mesa',
    subtitle:
      'Formulario para reservaciones del restaurante. Bodas, bautizos u otros eventos especiales se cotizan aparte.',
    back: 'Volver al inicio',
    errRequired: 'Completa los campos requeridos.',
    errEmailFmt: 'Introduce un correo electrónico válido.',
    errServer: (status) =>
      `Respuesta inválida del servidor (${status}). Revisa la API o el registro de PHP.`,
    success: 'Reservación enviada. Te contactaremos para confirmar.',
    errGeneric: 'No se pudo registrar la reservación.',
    errNetwork: 'Error de red. Intenta nuevamente.',
    sending: 'Enviando…',
    submit: 'Enviar reservación',
  },
  en: {
    badge: 'General reservation',
    title: 'Book your table',
    subtitle:
      'For regular dining reservations. Weddings, baptisms, and other special events are quoted separately.',
    back: 'Back to home',
    errRequired: 'Please fill in all required fields.',
    errEmailFmt: 'Please enter a valid email address.',
    errServer: (status) => `Invalid server response (${status}). Check the API or PHP logs.`,
    success: 'Request sent. We will contact you to confirm.',
    errGeneric: 'We could not save your reservation.',
    errNetwork: 'Network error. Please try again.',
    sending: 'Sending…',
    submit: 'Submit reservation',
  },
  fr: {
    badge: 'Réservation générale',
    title: 'Réservez votre table',
    subtitle:
      'Pour les réservations standards. Mariages, baptêmes et autres événements font l’objet d’un devis séparé.',
    back: "Retour à l’accueil",
    errRequired: 'Veuillez remplir tous les champs obligatoires.',
    errEmailFmt: 'Adresse e-mail invalide.',
    errServer: (status) => `Réponse serveur invalide (${status}).`,
    success: 'Demande envoyée. Nous vous contacterons pour confirmer.',
    errGeneric: 'Impossible d’enregistrer la réservation.',
    errNetwork: 'Erreur réseau. Réessayez.',
    sending: 'Envoi…',
    submit: 'Envoyer la réservation',
  },
  zh: {
    badge: '一般预订',
    title: '预订座位',
    subtitle: '餐厅日常用餐预订。婚礼、洗礼等大型活动请另行咨询报价。',
    back: '返回首页',
    errRequired: '请填写所有必填项。',
    errEmailFmt: '请输入有效的电子邮箱。',
    errServer: (status) => `服务器响应无效（${status}）。`,
    success: '已提交。我们将联系您确认。',
    errGeneric: '无法保存预订。',
    errNetwork: '网络错误，请重试。',
    sending: '提交中…',
    submit: '提交预订',
  },
}
