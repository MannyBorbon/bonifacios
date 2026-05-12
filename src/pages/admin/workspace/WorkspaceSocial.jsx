import { useState, useEffect, useCallback } from 'react'
import { Users, Send, Pin, Paperclip, X, ThumbsUp, Lightbulb, PartyPopper, AtSign, Eye } from 'lucide-react'
import { workspaceSocialAPI, workspaceBoardsAPI } from '../../../services/api'

const renderMentions = (text) => {
  const value = String(text || '')
  const parts = value.split(/(@[a-zA-Z0-9_.-]{3,40})/g)
  return parts.map((part, idx) => {
    if (/^@[a-zA-Z0-9_.-]{3,40}$/.test(part)) {
      return <span key={`${part}-${idx}`} className="font-medium text-fuchsia-300">{part}</span>
    }
    return <span key={`plain-${idx}`}>{part}</span>
  })
}

export default function WorkspaceSocial() {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}')
  const isAdminUser = String(currentUser?.role || '').toLowerCase() === 'administrador'

  const [socialPosts, setSocialPosts] = useState([])
  const [socialLoading, setSocialLoading] = useState(true)
  const [socialType, setSocialType] = useState('post')
  const [socialTitle, setSocialTitle] = useState('')
  const [socialContent, setSocialContent] = useState('')
  const [socialCommentDrafts, setSocialCommentDrafts] = useState({})
  const [socialUnreadMentions, setSocialUnreadMentions] = useState(0)
  const [socialMentions, setSocialMentions] = useState([])
  const [socialAttachmentFile, setSocialAttachmentFile] = useState(null)
  const [socialAttachmentPreview, setSocialAttachmentPreview] = useState('')
  const [socialPosting, setSocialPosting] = useState(false)
  const [workspaceUsers, setWorkspaceUsers] = useState([])

  const loadSocial = useCallback(async () => {
    setSocialLoading(true)
    try {
      const res = await workspaceSocialAPI.list()
      setSocialPosts(res.data?.posts || [])
      setSocialUnreadMentions(Number(res.data?.unread_mentions || 0))
      setSocialMentions(res.data?.mentions || [])
    } catch {
      setSocialPosts([])
      setSocialUnreadMentions(0)
      setSocialMentions([])
    } finally { setSocialLoading(false) }
  }, [])

  const loadUsers = useCallback(async () => {
    try {
      const res = await workspaceBoardsAPI.listUsers()
      setWorkspaceUsers(res.data?.users || [])
    } catch { setWorkspaceUsers([]) }
  }, [])

  useEffect(() => { loadSocial(); loadUsers() }, [loadSocial, loadUsers])

  useEffect(() => {
    return () => {
      if (socialAttachmentPreview && socialAttachmentPreview.startsWith('blob:')) {
        URL.revokeObjectURL(socialAttachmentPreview)
      }
    }
  }, [socialAttachmentPreview])

  const createSocialPost = async () => {
    const content = socialContent.trim()
    if (!content || socialPosting) return
    try {
      setSocialPosting(true)
      let attachmentPayload = {}
      if (socialAttachmentFile) {
        const formData = new FormData()
        formData.append('action', 'upload_attachment')
        formData.append('file', socialAttachmentFile)
        const uploadRes = await workspaceSocialAPI.uploadAttachment(formData)
        const attachment = uploadRes.data?.attachment
        if (attachment?.url) {
          attachmentPayload = {
            attachment_url: attachment.url,
            attachment_name: attachment.name || socialAttachmentFile.name,
            attachment_size: Number(attachment.size || socialAttachmentFile.size || 0),
            attachment_mime: attachment.mime || socialAttachmentFile.type || '',
          }
        }
      }
      await workspaceSocialAPI.createPost({ post_type: socialType, title: socialTitle.trim(), content, ...attachmentPayload })
      setSocialTitle('')
      setSocialContent('')
      setSocialType('post')
      setSocialAttachmentFile(null)
      setSocialAttachmentPreview('')
      await loadSocial()
    } catch { /* silent */ }
    finally { setSocialPosting(false) }
  }

  const createSocialComment = async (postId) => {
    const content = (socialCommentDrafts[postId] || '').trim()
    if (!content) return
    try {
      await workspaceSocialAPI.createComment({ post_id: postId, content })
      setSocialCommentDrafts(prev => ({ ...prev, [postId]: '' }))
      await loadSocial()
    } catch { /* silent */ }
  }

  const toggleSocialPin = async (postId, pinned) => {
    if (!isAdminUser) return
    try { await workspaceSocialAPI.togglePin({ post_id: postId, pinned: pinned ? 0 : 1 }); await loadSocial() } catch { /* silent */ }
  }

  const toggleSocialReaction = async (postId, reactionType) => {
    try { await workspaceSocialAPI.toggleReaction({ post_id: postId, reaction_type: reactionType }); await loadSocial() } catch { /* silent */ }
  }

  const markMentionsSeen = async () => {
    if (socialUnreadMentions <= 0) return
    try {
      await workspaceSocialAPI.markMentionsSeen()
      setSocialUnreadMentions(0)
      setSocialMentions(prev => prev.map(m => ({ ...m, seen_at: m.seen_at || new Date().toISOString() })))
    } catch { /* silent */ }
  }

  const markMentionSeen = async (mentionId) => {
    try {
      const target = socialMentions.find(m => Number(m.id) === Number(mentionId))
      const wasUnread = target ? !target.seen_at : false
      await workspaceSocialAPI.markMentionSeen({ mention_id: mentionId })
      setSocialMentions(prev => prev.map(m => Number(m.id) === Number(mentionId) ? { ...m, seen_at: m.seen_at || new Date().toISOString() } : m))
      if (wasUnread) setSocialUnreadMentions(prev => Math.max(0, prev - 1))
    } catch { /* silent */ }
  }

  const handleAttachmentChange = (event) => {
    const file = event.target.files?.[0] || null
    if (!file) return
    if (file.size > 8 * 1024 * 1024) return
    setSocialAttachmentFile(file)
    if (String(file.type || '').startsWith('image/')) {
      setSocialAttachmentPreview(URL.createObjectURL(file))
    } else {
      setSocialAttachmentPreview('')
    }
  }

  const REACTIONS = [
    { key: 'like', label: 'Me gusta', icon: ThumbsUp },
    { key: 'insightful', label: 'Util', icon: Lightbulb },
    { key: 'celebrate', label: 'Celebrar', icon: PartyPopper },
  ]

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500/20 to-purple-400/20 flex items-center justify-center">
            <Users size={18} className="text-fuchsia-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Social Hub</h2>
            <p className="text-xs text-slate-400">Anuncios y posts del equipo</p>
          </div>
        </div>
        {socialUnreadMentions > 0 && (
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-2.5 py-1 text-[10px] text-fuchsia-200">{socialUnreadMentions} menciones</span>
            <button onClick={markMentionsSeen} className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-1 text-[10px] text-fuchsia-200 hover:bg-fuchsia-500/20 transition-all">
              <Eye size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Mentions inbox */}
      {socialMentions.length > 0 && (
        <div className="rounded-2xl border border-fuchsia-500/15 bg-[#060d1f]/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AtSign size={12} className="text-fuchsia-400" />
              <span className="text-xs font-medium text-fuchsia-200">Menciones</span>
            </div>
            <span className="text-[10px] text-slate-500">{socialMentions.length} recientes</span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {socialMentions.slice(0, 6).map(mention => {
              const isUnread = !mention.seen_at
              return (
                <div key={mention.id} className={`rounded-lg border px-3 py-2 ${isUnread ? 'border-fuchsia-400/25 bg-fuchsia-500/5' : 'border-slate-700/30 bg-slate-800/20'}`}>
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-slate-200">{mention.mentioned_by_name || mention.mentioned_by_username || 'Usuario'} te menciono</p>
                    <button onClick={() => markMentionSeen(mention.id)} disabled={!isUnread}
                      className="rounded-md border border-fuchsia-500/25 bg-fuchsia-500/10 px-2 py-0.5 text-[10px] text-fuchsia-200 disabled:opacity-40">
                      {isUnread ? 'Marcar leida' : 'Leida'}
                    </button>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400 line-clamp-1">{mention.post_preview || mention.post_title || 'Sin vista previa'}</p>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Composer */}
      <div className="rounded-2xl border border-slate-700/30 bg-[#060d1f]/60 p-3 sm:p-4 space-y-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select value={socialType} onChange={e => setSocialType(e.target.value)}
            className="rounded-xl border border-slate-700/40 bg-[#050a14]/80 px-3 py-3 sm:py-2 text-xs text-slate-200 focus:border-fuchsia-500/40 focus:outline-none transition-colors min-h-[44px]">
            <option value="post">Post</option>
            <option value="announcement">Anuncio</option>
          </select>
          <input value={socialTitle} onChange={e => setSocialTitle(e.target.value)} placeholder="Titulo (opcional)"
            className="rounded-xl border border-slate-700/40 bg-[#050a14]/80 px-3 py-3 sm:py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-fuchsia-500/40 focus:outline-none transition-colors min-h-[44px]" />
          <button onClick={createSocialPost} disabled={socialPosting || !socialContent.trim()}
            className="rounded-xl border border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-500/15 to-purple-500/15 px-4 py-3 sm:py-2 text-xs font-medium text-fuchsia-300 hover:from-fuchsia-500/25 hover:to-purple-500/25 disabled:opacity-40 transition-all touch-manipulation min-h-[44px]">
            {socialPosting ? 'Publicando...' : 'Publicar'}
          </button>
        </div>
        <textarea value={socialContent} onChange={e => setSocialContent(e.target.value)} rows={3} placeholder="Comparte un anuncio, update o post interno..."
          className="w-full rounded-xl border border-slate-700/40 bg-[#050a14]/80 px-4 py-3 sm:py-2.5 text-sm text-slate-300 placeholder-slate-500 focus:border-fuchsia-500/40 focus:outline-none transition-colors resize-none" />
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-slate-700/40 bg-slate-800/40 px-2.5 py-1.5 text-[11px] text-slate-400 hover:text-slate-300 transition-colors">
            <Paperclip size={12} /> Adjuntar
            <input type="file" accept="image/*,.pdf,.txt" onChange={handleAttachmentChange} className="hidden" />
          </label>
          {socialAttachmentFile && (
            <>
              <span className="text-[11px] text-slate-400">{socialAttachmentFile.name}</span>
              <button onClick={() => { setSocialAttachmentFile(null); setSocialAttachmentPreview('') }}
                className="rounded-md border border-red-500/30 bg-red-500/10 px-2 py-1 text-[10px] text-red-300 hover:bg-red-500/20 transition-all"><X size={10} /></button>
            </>
          )}
        </div>
        {socialAttachmentPreview && (
          <div className="rounded-lg border border-slate-700/30 bg-slate-800/20 p-2">
            <img src={socialAttachmentPreview} alt="Preview" className="max-h-40 rounded-md object-cover" />
          </div>
        )}
        <p className="text-[10px] text-slate-600">
          Menciona con <span className="text-fuchsia-300">@username</span>. Usuarios: {workspaceUsers.slice(0, 8).map(u => `@${u.username}`).join(', ') || 'cargando...'}
        </p>
      </div>

      {/* Posts feed */}
      {socialLoading ? (
        <div className="h-24 flex items-center justify-center"><div className="h-6 w-6 animate-spin rounded-full border border-fuchsia-500/20 border-t-fuchsia-400" /></div>
      ) : (
        <div className="space-y-3">
          {socialPosts.map(post => (
            <div key={post.id} className="rounded-2xl border border-slate-700/30 bg-[#060d1f]/60 p-4">
              {/* Post header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 flex items-center justify-center text-[10px] font-bold text-fuchsia-300">
                    {(post.full_name || post.username || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{post.title || (post.post_type === 'announcement' ? 'Anuncio' : 'Post')}</p>
                    <p className="text-[10px] text-slate-500">{post.full_name || post.username || 'Usuario'} · {post.post_type === 'announcement' ? 'Anuncio' : 'Post'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {(Number(post.pinned) === 1) && (
                    <span className="rounded-full border border-yellow-400/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-200 flex items-center gap-1"><Pin size={8} /> Fijado</span>
                  )}
                  {isAdminUser && (
                    <button onClick={() => toggleSocialPin(post.id, Number(post.pinned) === 1)}
                      className="rounded-lg p-1.5 text-slate-500 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 transition-all">
                      <Pin size={12} />
                    </button>
                  )}
                </div>
              </div>

              {/* Content */}
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{renderMentions(post.content)}</p>

              {/* Attachment */}
              {post.attachment_url && (
                <div className="mt-3 rounded-lg border border-slate-700/30 bg-slate-800/20 p-2">
                  {String(post.attachment_mime || '').startsWith('image/') ? (
                    <a href={post.attachment_url} target="_blank" rel="noreferrer"><img src={post.attachment_url} alt={post.attachment_name || 'Adjunto'} className="max-h-56 w-full rounded-md object-cover" /></a>
                  ) : (
                    <a href={post.attachment_url} target="_blank" rel="noreferrer" className="text-xs text-fuchsia-300 underline">{post.attachment_name || 'Descargar adjunto'}</a>
                  )}
                </div>
              )}

              {/* Reactions */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {REACTIONS.map(reaction => {
                  const Icon = reaction.icon
                  const active = Boolean(post.user_reactions?.[reaction.key])
                  const count = Number(post.reaction_counts?.[reaction.key] || 0)
                  return (
                    <button key={reaction.key} onClick={() => toggleSocialReaction(post.id, reaction.key)}
                      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-all ${
                        active ? 'border-fuchsia-400/30 bg-fuchsia-500/10 text-fuchsia-200' : 'border-slate-700/40 bg-slate-800/30 text-slate-400 hover:border-fuchsia-500/25'
                      }`}>
                      <Icon size={12} /> {reaction.label} · {count}
                    </button>
                  )
                })}
              </div>

              {/* Comments */}
              <div className="mt-3 space-y-2">
                {(post.comments || []).map(comment => (
                  <div key={comment.id} className="rounded-lg border border-slate-700/20 bg-slate-800/20 px-3 py-2">
                    <p className="text-xs text-slate-200">{renderMentions(comment.content)}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{comment.full_name || comment.username || 'Usuario'}</p>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input value={socialCommentDrafts[post.id] || ''} onChange={e => setSocialCommentDrafts(prev => ({ ...prev, [post.id]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') createSocialComment(post.id) }}
                    placeholder="Comentar..."
                    className="flex-1 rounded-lg border border-slate-700/40 bg-[#050a14]/60 px-3 py-2.5 sm:py-2 text-xs text-slate-300 placeholder-slate-600 focus:border-fuchsia-500/40 focus:outline-none transition-colors min-h-[40px]" />
                  <button onClick={() => createSocialComment(post.id)}
                    className="rounded-lg border border-fuchsia-500/30 bg-fuchsia-500/10 px-2.5 py-2.5 sm:py-2 text-fuchsia-300 hover:bg-fuchsia-500/20 transition-all touch-manipulation min-w-[40px] min-h-[40px] flex items-center justify-center">
                    <Send size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {socialPosts.length === 0 && (
            <div className="rounded-2xl border border-slate-700/30 bg-[#060d1f]/40 p-8 text-center">
              <p className="text-sm text-slate-500">No hay publicaciones. Publica el primer anuncio del equipo.</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
