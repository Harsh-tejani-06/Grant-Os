import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import api from '../api'
import { socket, joinProposalRoom, leaveProposalRoom } from '../socket'

export default function ProposalWritingWorkspace({ userName }) {
  const [proposals, setProposals] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedProposalId, setSelectedProposalId] = useState(null)
  const [selectedSectionId, setSelectedSectionId] = useState(null)
  const [content, setContent] = useState('')
  const [sectionStatus, setSectionStatus] = useState('Not Started')
  const [saving, setSaving] = useState(false)
  const [lastSavedTime, setLastSavedTime] = useState(null)
  const [activeRightTab, setActiveRightTab] = useState('ai')
  const [editorMode, setEditorMode] = useState('edit') // 'edit' | 'preview'
  const [socketConnected, setSocketConnected] = useState(socket.connected)
  const [liveNotification, setLiveNotification] = useState(null)
  const [unreadChatCount, setUnreadChatCount] = useState(0)

  const showLiveNotification = (message, type = 'info') => {
    setLiveNotification({ message, type })
    setTimeout(() => {
      setLiveNotification((prev) => (prev?.message === message ? null : prev))
    }, 4500)
  }

  const textareaRef = useRef(null)
  const chatContainerRef = useRef(null)

  // Derived state
  const currentProposal = proposals.find((p) => p._id === selectedProposalId)
  const currentSection = currentProposal?.sections?.find((s) => s._id === selectedSectionId)

  // Auto-scroll chat to bottom on new comments or tab switch, and reset unread count
  useEffect(() => {
    if (activeRightTab === 'comments') {
      setUnreadChatCount(0)
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
      }
    }
  }, [activeRightTab, currentProposal?.comments])

  // AI State
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState('')

  // Comments State
  const [newComment, setNewComment] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)

  // ─── User Info & PI Master State ───
  const getInitialUser = () => {
    try {
      const stored = localStorage.getItem('grantos_user')
      if (stored) {
        const u = JSON.parse(stored)
        return {
          id: u.id || u._id || '',
          role: u.role || '',
          jobTitle: u.jobTitle || '',
          fullName: u.fullName || u.name || '',
          email: u.email || '',
        }
      }
    } catch {}
    return { id: '', role: '', jobTitle: '', fullName: '', email: '' }
  }

  const [currentUserInfo, setCurrentUserInfo] = useState(getInitialUser)
  const [showFullProposalModal, setShowFullProposalModal] = useState(false)
  const [submittingToAdmin, setSubmittingToAdmin] = useState(false)
  const [reviewSectionModal, setReviewSectionModal] = useState(null)
  const [approvingSectionId, setApprovingSectionId] = useState(null)
  const [workspaceView, setWorkspaceView] = useState('review') // 'review' | 'editor'

  useEffect(() => {
    api.get('/auth/me').then((res) => {
      if (res.data.success && res.data.user) {
        setCurrentUserInfo({
          id: res.data.user.id || res.data.user._id || '',
          role: res.data.user.role || '',
          jobTitle: res.data.user.jobTitle || '',
          fullName: res.data.user.fullName || '',
          email: res.data.user.email || '',
        })
      }
    }).catch(() => {})
  }, [])

  const nameToCheck = (currentUserInfo.fullName || userName || '').toLowerCase()
  const titleToCheck = (currentUserInfo.jobTitle || '').toLowerCase()
  const emailToCheck = (currentUserInfo.email || '').toLowerCase()

  const isPI = currentUserInfo.role === 'org_admin' || 
    titleToCheck.includes('principal investigator') ||
    titleToCheck.includes('pi') ||
    nameToCheck.includes('principal investigator') ||
    nameToCheck.includes('pi') ||
    nameToCheck.includes('thorne') ||
    emailToCheck.includes('pi.') ||
    emailToCheck.startsWith('pi@')

  const isAssignedToUser = (sec) => {
    if (!sec) return false
    const userId = currentUserInfo.id
    if (userId && sec.assignedTo) {
      if (
        sec.assignedTo === userId ||
        sec.assignedTo?._id === userId ||
        sec.assignedTo?.toString() === userId?.toString()
      ) {
        return true
      }
    }
    const currentName = (currentUserInfo.fullName || userName || '').trim().toLowerCase()
    const assignedName = (sec.assignedToName || '').trim().toLowerCase()
    if (currentName && assignedName) {
      if (assignedName === currentName) return true
      if (
        isPI &&
        (assignedName.includes('principal investigator') ||
         assignedName.includes('pi') ||
         assignedName.includes('thorne'))
      ) {
        return true
      }
    }
    return false
  }

  const myAssignedSections = currentProposal?.sections?.filter((sec) => isAssignedToUser(sec)) || []
  const isProposalLocked = ['Submitted to Admin', 'Submitted to Agency', 'Under Evaluation', 'Awarded', 'Rejected', 'Submitted'].includes(currentProposal?.status)

  const handleApproveSection = async (sectionId) => {
    if (!selectedProposalId || !sectionId || isProposalLocked) return
    try {
      setApprovingSectionId(sectionId)
      const res = await api.put(`/proposals/${selectedProposalId}/sections/${sectionId}`, {
        status: 'Approved',
      })
      if (res.data.success) {
        setProposals((prev) =>
          prev.map((p) => {
            if (p._id === selectedProposalId) {
              const updatedSections = p.sections.map((s) =>
                s._id === sectionId ? { ...s, status: 'Approved', lastEditedAt: new Date() } : s
              )
              const totalSec = updatedSections.length
              const compSec = updatedSections.filter((s) => s.status === 'Ready for Review' || s.status === 'Approved').length
              const progress = totalSec > 0 ? Math.round((compSec / totalSec) * 100) : 0
              return {
                ...p,
                progress: res.data.proposal?.progress ?? progress,
                sections: updatedSections,
              }
            }
            return p
          })
        )
        if (selectedSectionId === sectionId) {
          setSectionStatus('Approved')
        }
        if (reviewSectionModal && reviewSectionModal._id === sectionId) {
          setReviewSectionModal((prev) => ({ ...prev, status: 'Approved' }))
        }
      }
    } catch (err) {
      console.error('Failed to approve section:', err)
    } finally {
      setApprovingSectionId(null)
    }
  }

  const handleApproveAllSections = async () => {
    if (!selectedProposalId || isProposalLocked) return
    try {
      const res = await api.put(`/proposals/${selectedProposalId}/approve-all`)
      if (res.data.success) {
        setProposals((prev) =>
          prev.map((p) => {
            if (p._id === selectedProposalId) {
              return {
                ...p,
                progress: 100,
                status: 'Under Review',
                sections: p.sections.map((s) => ({ ...s, status: 'Approved', lastEditedAt: new Date() })),
              }
            }
            return p
          })
        )
        if (reviewSectionModal) {
          setReviewSectionModal((prev) => ({ ...prev, status: 'Approved' }))
        }
        setSectionStatus('Approved')
        setShowFullProposalModal(false)
      }
    } catch (err) {
      console.error('Failed to approve all sections:', err)
    }
  }

  const handleSubmitToAdmin = async () => {
    if (!selectedProposalId || isProposalLocked) return
    try {
      setSubmittingToAdmin(true)
      const res = await api.put(`/proposals/${selectedProposalId}/submit-admin`)
      if (res.data.success) {
        fetchProposals()
        setShowFullProposalModal(false)
        alert('🚀 Master Proposal successfully submitted to Organization Admin!')
      }
    } catch (err) {
      console.error('Failed to submit proposal to admin:', err)
    } finally {
      setSubmittingToAdmin(false)
    }
  }

  // ─── Table Builder State (Clean 3x3 Structure) ───
  const [showTableModal, setShowTableModal] = useState(false)
  const [tableData, setTableData] = useState({
    headers: ['Header 1', 'Header 2', 'Header 3'],
    rows: [
      ['', '', ''],
      ['', '', ''],
      ['', '', ''],
    ],
  })

  const handleAddTableColumn = () => {
    setTableData((prev) => ({
      headers: [...prev.headers, `Column ${prev.headers.length + 1}`],
      rows: prev.rows.map((row) => [...row, '']),
    }))
  }

  const handleRemoveTableColumn = (colIdx) => {
    if (tableData.headers.length <= 1) return
    setTableData((prev) => ({
      headers: prev.headers.filter((_, i) => i !== colIdx),
      rows: prev.rows.map((row) => row.filter((_, i) => i !== colIdx)),
    }))
  }

  const handleAddTableRow = () => {
    setTableData((prev) => ({
      ...prev,
      rows: [...prev.rows, new Array(prev.headers.length).fill('')],
    }))
  }

  const handleRemoveTableRow = (rowIdx) => {
    if (tableData.rows.length <= 1) return
    setTableData((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== rowIdx),
    }))
  }

  const handleHeaderChange = (colIdx, val) => {
    setTableData((prev) => {
      const nextHeaders = [...prev.headers]
      nextHeaders[colIdx] = val
      return { ...prev, headers: nextHeaders }
    })
  }

  const handleCellChange = (rowIdx, colIdx, val) => {
    setTableData((prev) => {
      const nextRows = prev.rows.map((row, rI) => {
        if (rI === rowIdx) {
          const nextRow = [...row]
          nextRow[colIdx] = val
          return nextRow
        }
        return row
      })
      return { ...prev, rows: nextRows }
    })
  }

  const handleInsertStructuredTable = () => {
    const headerLine = '| ' + tableData.headers.map((h) => h || 'Header').join(' | ') + ' |'
    const dividerLine = '| ' + tableData.headers.map(() => ':---').join(' | ') + ' |'
    const rowLines = tableData.rows.map(
      (row) => '| ' + row.map((c) => c || '-').join(' | ') + ' |'
    )

    const tableMarkdown = '\n\n' + [headerLine, dividerLine, ...rowLines].join('\n') + '\n\n'
    applyFormatting(tableMarkdown, '', '')
    setShowTableModal(false)
  }

  // ─── Selection-Aware Formatting Handler ───
  const applyFormatting = (prefix, suffix = '', defaultText = '') => {
    const el = textareaRef.current
    if (!el) {
      setContent((prev) => prev + prefix + defaultText + suffix)
      return
    }

    const start = el.selectionStart
    const end = el.selectionEnd
    const selectedText = content.substring(start, end)

    const textToWrap = selectedText || defaultText
    const newText =
      content.substring(0, start) +
      prefix +
      textToWrap +
      suffix +
      content.substring(end)

    setContent(newText)

    setTimeout(() => {
      if (el) {
        el.focus()
        if (selectedText) {
          el.setSelectionRange(start + prefix.length, end + prefix.length)
        } else {
          el.setSelectionRange(
            start + prefix.length,
            start + prefix.length + textToWrap.length
          )
        }
      }
    }, 10)
  }

  const handleExportPDF = (proposal) => {
    if (!proposal || !isPI) return

    const printWindow = window.open('', '_blank')
    if (!printWindow) {
      alert('Please allow popups to export proposal as PDF.')
      return
    }

    const sectionsHtml = (proposal.sections || [])
      .map((sec) => `
        <div style="margin-bottom: 28px; page-break-inside: avoid;">
          <div style="border-bottom: 2px solid #6b21a8; padding-bottom: 6px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
            <h2 style="color: #3b0764; font-size: 15px; font-weight: bold; margin: 0;">${sec.title}</h2>
            <span style="font-size: 11px; color: #6b7280; font-weight: 600;">Writer: ${sec.assignedToName || 'Unassigned'} | Status: ${sec.status}</span>
          </div>
          <div style="font-size: 13px; line-height: 1.7; color: #1f2937; white-space: pre-wrap; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fafafa; padding: 12px; border-radius: 6px; border: 1px solid #f3f4f6;">
            ${sec.content ? sec.content.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '<em style="color: #9ca3af;">[Section content pending]</em>'}
          </div>
        </div>
      `)
      .join('')

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${proposal.title} - Research Proposal</title>
          <style>
            @page { size: A4; margin: 20mm; }
            body { font-family: 'Georgia', 'Times New Roman', serif; color: #111827; margin: 0; padding: 20px; }
            .cover-page { text-align: center; padding: 50px 20px; border-bottom: 3px double #1e1b4b; margin-bottom: 35px; }
            .org-badge { font-size: 11px; font-weight: bold; text-transform: uppercase; letter-spacing: 2.5px; color: #4338ca; margin-bottom: 12px; font-family: sans-serif; }
            .proposal-title { font-size: 26px; font-weight: bold; color: #0f172a; margin-bottom: 20px; line-height: 1.35; }
            .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; max-width: 650px; margin: 25px auto 0 auto; text-align: left; background: #f8fafc; padding: 18px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 12.5px; font-family: sans-serif; }
            .meta-label { font-weight: bold; color: #475569; }
            .meta-val { color: #0f172a; }
            .header-info { display: flex; justify-content: space-between; font-size: 10.5px; color: #64748b; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 30px; font-family: sans-serif; }
            @media print { .no-print { display: none !important; } }
          </style>
        </head>
        <body>
          <div class="no-print" style="margin-bottom: 20px; text-align: right;">
            <button onclick="window.print()" style="background: #1e1b4b; color: white; border: none; padding: 10px 22px; font-size: 14px; font-weight: bold; border-radius: 8px; cursor: pointer; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              📥 Save / Print as PDF
            </button>
          </div>

          <div class="cover-page">
            <div class="org-badge">OFFICIAL RESEARCH PROPOSAL</div>
            <div class="proposal-title">${proposal.title}</div>
            
            <div class="meta-grid">
              <div><span class="meta-label">Funding Agency:</span> <span class="meta-val">${proposal.grantAgency || 'N/A'}</span></div>
              <div><span class="meta-label">Grant Scheme:</span> <span class="meta-val">${proposal.grantTitle || 'N/A'}</span></div>
              <div><span class="meta-label">Funding Requested:</span> <span class="meta-val">${proposal.fundingAmount || 'N/A'}</span></div>
              <div><span class="meta-label">Submission Deadline:</span> <span class="meta-val">${proposal.deadline || 'N/A'}</span></div>
              <div><span class="meta-label">Total Sections:</span> <span class="meta-val">${proposal.sections?.length || 17} Sections</span></div>
              <div><span class="meta-label">Date of Submission:</span> <span class="meta-val">${new Date().toLocaleDateString()}</span></div>
            </div>
          </div>

          <div class="header-info">
            <span>Official Research Proposal Submission</span>
            <span>Ref: ${proposal.grantTitle || proposal.title}</span>
          </div>

          ${sectionsHtml}

          <script>
            window.onload = function() {
              setTimeout(function() { window.print(); }, 400);
            }
          </script>
        </body>
      </html>
    `

    printWindow.document.write(htmlContent)
    printWindow.document.close()
  }

  // ─── Live Preview Markdown Parser ───
  const renderFormattedContent = (mdText) => {
    if (!mdText || !mdText.trim()) {
      return (
        <div className="p-8 text-center text-warm-gray-400 italic">
          No content written yet. Switch to Edit mode to write or generate text.
        </div>
      )
    }

    const lines = mdText.split('\n')
    const elements = []
    let inTable = false
    let tableRows = []

    lines.forEach((line, idx) => {
      const trimmed = line.trim()

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true
        if (!trimmed.includes('---')) {
          const cells = trimmed.split('|').filter((_, i, arr) => i > 0 && i < arr.length - 1)
          tableRows.push(cells)
        }
        return
      }

      if (inTable && (!trimmed.startsWith('|') || idx === lines.length - 1)) {
        inTable = false
        if (tableRows.length > 0) {
          const header = tableRows[0]
          const body = tableRows.slice(1)
          elements.push(
            <div key={`table-${idx}`} className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-warm-gray-200 text-xs">
                <thead>
                  <tr className="bg-purple-50">
                    {header.map((cell, cIdx) => (
                      <th key={cIdx} className="border border-warm-gray-200 px-3 py-2 text-left font-bold text-warm-gray-900">
                        {cell.trim()}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {body.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-warm-gray-50/50'}>
                      {row.map((cell, cIdx) => (
                        <td key={cIdx} className="border border-warm-gray-200 px-3 py-2 text-warm-gray-800">
                          {cell.trim()}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
          tableRows = []
        }
      }

      if (!trimmed) {
        elements.push(<div key={idx} className="h-2" />)
        return
      }

      if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={idx} className="font-heading font-bold text-lg text-purple-950 border-b border-purple-100 pb-1 mt-5 mb-2">{trimmed.replace('## ', '')}</h2>)
      } else if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={idx} className="font-heading font-bold text-sm text-warm-gray-900 mt-4 mb-1.5">{trimmed.replace('### ', '')}</h3>)
      } else if (trimmed.startsWith('> ')) {
        elements.push(<blockquote key={idx} className="border-l-4 border-purple-500 pl-3 py-1.5 my-2.5 bg-purple-50/50 rounded-r text-xs italic text-warm-gray-700">{trimmed.replace('> ', '')}</blockquote>)
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(<li key={idx} className="ml-4 list-disc text-xs text-warm-gray-800 my-1">{trimmed.replace(/^[-*]\s+/, '')}</li>)
      } else if (/^\d+\.\s+/.test(trimmed)) {
        elements.push(<li key={idx} className="ml-4 list-decimal text-xs text-warm-gray-800 my-1">{trimmed.replace(/^\d+\.\s+/, '')}</li>)
      } else {
        const parts = trimmed.split(/(\*\*.*?\*\*|\*.*?\*)/g)
        elements.push(
          <p key={idx} className="text-xs text-warm-gray-800 leading-relaxed my-1.5">
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pIdx} className="font-bold text-warm-gray-900">{part.slice(2, -2)}</strong>
              }
              if (part.startsWith('*') && part.endsWith('*')) {
                return <em key={pIdx} className="italic text-warm-gray-800">{part.slice(1, -1)}</em>
              }
              return part
            })}
          </p>
        )
      }
    })

    return <div className="space-y-1">{elements}</div>
  }

  // ─── Fetch proposals ───
  const fetchProposals = async () => {
    try {
      setLoading(true)
      const res = await api.get('/proposals/my-assigned')
      if (res.data.success && res.data.proposals) {
        setProposals(res.data.proposals)
        if (res.data.proposals.length > 0) {
          const firstProp = res.data.proposals[0]
          setSelectedProposalId(firstProp._id)
          if (firstProp.sections && firstProp.sections.length > 0) {
            const myFirst = firstProp.sections.find((s) => isAssignedToUser(s)) || firstProp.sections[0]
            setSelectedSectionId(myFirst._id)
            setContent(myFirst.content || '')
            setSectionStatus(myFirst.status || 'Not Started')
          }
        }
      }
    } catch (err) {
      console.error('Failed to load proposals:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProposals()
  }, [])

  // ─── Real-Time Live Updates via Socket.io ───
  useEffect(() => {
    if (!selectedProposalId) return

    joinProposalRoom(selectedProposalId)

    const handleConnect = () => setSocketConnected(true)
    const handleDisconnect = () => setSocketConnected(false)

    // 1. Instant Team Chat message
    const handleProposalComment = (data) => {
      if (!data || data.proposalId !== selectedProposalId) return

      setProposals((prev) =>
        prev.map((p) => {
          if (p._id === data.proposalId) {
            const currentList = p.comments || []
            const newComment = data.comment
            // Avoid duplicate if sent by current user and already updated by API response
            const exists = newComment && currentList.some(
              (c) =>
                (c._id && newComment._id && c._id === newComment._id) ||
                (c.text === newComment.text &&
                  c.senderName === newComment.senderName &&
                  Math.abs(new Date(c.createdAt) - new Date(newComment.createdAt)) < 2500)
            )
            if (exists) return p
            return {
              ...p,
              comments: data.comments || [...currentList, newComment],
            }
          }
          return p
        })
      )

      if (activeRightTab !== 'comments') {
        setUnreadChatCount((prev) => prev + 1)
      }

      if (data.comment?.senderName && data.comment.senderName !== (currentUserInfo.fullName || userName)) {
        showLiveNotification(`💬 ${data.comment.senderName}: "${data.comment.text?.slice(0, 45)}"`, 'chat')
      }

      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
        }
      }, 50)
    }

    // 2. Instant Section status or content update
    const handleSectionUpdate = (data) => {
      if (!data || data.proposalId !== selectedProposalId) return

      setProposals((prev) =>
        prev.map((p) => {
          if (p._id === data.proposalId) {
            const updatedSections = p.sections.map((s) =>
              s._id === data.sectionId ? { ...s, ...data.section } : s
            )
            return {
              ...p,
              progress: data.progress !== undefined ? data.progress : p.progress,
              sections: updatedSections,
            }
          }
          return p
        })
      )

      if (selectedSectionId === data.sectionId && data.section?.status) {
        setSectionStatus(data.section.status)
      }

      setReviewSectionModal((curr) => {
        if (curr && curr._id === data.sectionId) {
          return { ...curr, ...data.section }
        }
        return curr
      })

      const updater = data.updatedBy?.name || 'A team member'
      if (data.updatedBy?.name !== (currentUserInfo.fullName || userName)) {
        showLiveNotification(`⚡ ${data.section?.title || 'Section'} status updated to "${data.section?.status}" by ${updater}`, 'status')
      }
    }

    // 3. Instant All Sections Approved (PI or Admin)
    const handleAllApproved = (data) => {
      if (!data || data.proposalId !== selectedProposalId) return

      setProposals((prev) =>
        prev.map((p) => {
          if (p._id === data.proposalId) {
            return {
              ...p,
              progress: 100,
              status: data.status || 'Under Review',
              sections: p.sections.map((s) => ({ ...s, status: 'Approved', lastEditedAt: new Date() })),
            }
          }
          return p
        })
      )
      setSectionStatus('Approved')
      setReviewSectionModal((curr) => (curr ? { ...curr, status: 'Approved' } : null))
      showLiveNotification(`🎉 All 17 sections have been Approved!`, 'approval')
    }

    // 4. Instant Submitted to Admin
    const handleSubmittedToAdmin = (data) => {
      if (!data || data.proposalId !== selectedProposalId) return

      setProposals((prev) =>
        prev.map((p) => {
          if (p._id === data.proposalId) {
            return {
              ...p,
              status: 'Submitted to Admin',
              submittedByPIAt: data.submittedByPIAt || new Date(),
            }
          }
          return p
        })
      )
      showLiveNotification(`🚀 Proposal successfully submitted to Organization Admin!`, 'status')
    }

    // 5. Instant Section Assignments Update
    const handleSectionsAssigned = (data) => {
      if (!data || data.proposalId !== selectedProposalId) return
      if (data.proposal) {
        setProposals((prev) =>
          prev.map((p) => (p._id === data.proposalId ? { ...p, ...data.proposal } : p))
        )
        showLiveNotification(`👥 Section assignments have been updated by Admin`, 'status')
      }
    }

    // 6. Submitted to Agency by Admin
    const handleSubmittedToAgency = (data) => {
      if (!data || data.proposalId !== selectedProposalId) return

      setProposals((prev) =>
        prev.map((p) => {
          if (p._id === data.proposalId) {
            const commentsList = data.comments || (data.comment ? [...(p.comments || []), data.comment] : p.comments)
            return {
              ...p,
              status: 'Submitted to Agency',
              agencySubmission: data.agencySubmission,
              comments: commentsList,
            }
          }
          return p
        })
      )
      showLiveNotification(
        '🏛️ Your proposal has been officially endorsed and submitted to the funding agency by the Organization Admin.',
        'approval'
      )
    }

    // 7. Checklist updated
    const handleChecklistUpdated = (data) => {
      if (!data || data.proposalId !== selectedProposalId) return
      setProposals((prev) =>
        prev.map((p) => (p._id === data.proposalId ? { ...p, preSubmissionChecklist: data.checklist } : p))
      )
    }

    // 8. Lifecycle Tracking status updated by Org Admin
    const handleTrackingStatusUpdated = (data) => {
      if (!data || data.proposalId !== selectedProposalId) return
      setProposals((prev) =>
        prev.map((p) => {
          if (p._id === data.proposalId) {
            const commentsList = data.comments || (data.comment ? [...(p.comments || []), data.comment] : p.comments)
            return {
              ...p,
              status: data.status,
              awardDetails: data.awardDetails || p.awardDetails,
              trackingTimeline: data.trackingTimeline || p.trackingTimeline,
              comments: commentsList,
            }
          }
          return p
        })
      )

      const stageEmoji =
        data.status === 'Awarded' ? '🏆' :
        data.status === 'Under Evaluation' ? '🔍' :
        data.status === 'Revisions Requested' ? '📝' :
        data.status === 'Rejected' ? '❌' : '📊'

      showLiveNotification(
        `${stageEmoji} Proposal tracking status updated to "${data.status}" by Org Admin.`,
        data.status === 'Awarded' ? 'approval' : 'status'
      )
    }

    socket.on('connect', handleConnect)
    socket.on('disconnect', handleDisconnect)
    socket.on('proposalCommentAdded', handleProposalComment)
    socket.on('proposalSectionUpdated', handleSectionUpdate)
    socket.on('proposalAllSectionsApproved', handleAllApproved)
    socket.on('proposalSubmittedToAdmin', handleSubmittedToAdmin)
    socket.on('proposalSubmittedToAgency', handleSubmittedToAgency)
    socket.on('proposalChecklistUpdated', handleChecklistUpdated)
    socket.on('proposalSectionsAssigned', handleSectionsAssigned)
    socket.on('proposalTrackingStatusUpdated', handleTrackingStatusUpdated)

    return () => {
      leaveProposalRoom(selectedProposalId)
      socket.off('connect', handleConnect)
      socket.off('disconnect', handleDisconnect)
      socket.off('proposalCommentAdded', handleProposalComment)
      socket.off('proposalSectionUpdated', handleSectionUpdate)
      socket.off('proposalAllSectionsApproved', handleAllApproved)
      socket.off('proposalSubmittedToAdmin', handleSubmittedToAdmin)
      socket.off('proposalSubmittedToAgency', handleSubmittedToAgency)
      socket.off('proposalChecklistUpdated', handleChecklistUpdated)
      socket.off('proposalSectionsAssigned', handleSectionsAssigned)
      socket.off('proposalTrackingStatusUpdated', handleTrackingStatusUpdated)
    }
  }, [selectedProposalId, selectedSectionId, activeRightTab, currentUserInfo.fullName, userName])

  // Sync editor when section changes
  useEffect(() => {
    if (currentSection) {
      setContent(currentSection.content || '')
      setSectionStatus(currentSection.status || 'Not Started')
      setAiResult('')
    }
  }, [selectedSectionId])

  // Word count
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0
  const charCount = content.length
  const wordLimit = currentSection?.wordCountLimit || 500
  const isOverLimit = wordCount > wordLimit

  // ─── Save Section ───
  const handleSaveSection = async (newStatus = sectionStatus) => {
    if (!selectedProposalId || !selectedSectionId) return
    if (isProposalLocked) {
      alert(`This proposal is ${currentProposal?.status}. Dossier is locked and cannot be edited.`)
      return
    }
    if (!isAssignedToUser(currentSection) && newStatus !== 'Approved') {
      alert('You can only edit sections assigned to you.')
      return
    }
    try {
      setSaving(true)
      const res = await api.put(`/proposals/${selectedProposalId}/sections/${selectedSectionId}`, {
        content,
        status: newStatus,
      })
      if (res.data.success) {
        setSectionStatus(newStatus)
        setLastSavedTime(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        setProposals((prev) =>
          prev.map((p) => {
            if (p._id === selectedProposalId) {
              return {
                ...p,
                progress: res.data.proposal.progress,
                sections: p.sections.map((s) =>
                  s._id === selectedSectionId ? { ...s, content, status: newStatus, lastEditedAt: new Date() } : s
                ),
              }
            }
            return p
          })
        )
      }
    } catch (err) {
      console.error('Save failed:', err)
    } finally {
      setSaving(false)
    }
  }

  // Toggle review status
  const handleToggleReview = () => {
    if (isProposalLocked) return
    const next = sectionStatus === 'Ready for Review' ? 'In Progress' : 'Ready for Review'
    handleSaveSection(next)
  }

  // ─── AI Assist ───
  const handleAiAssist = async (action) => {
    if (!currentSection || isProposalLocked) return
    try {
      setAiLoading(true)
      setAiResult('')
      const res = await api.post('/proposals/ai-assist', {
        action,
        proposalId: currentProposal?._id,
        proposalTitle: currentProposal?.title,
        sectionKey: currentSection.sectionKey,
        sectionTitle: currentSection.title,
        wordCountLimit: currentSection.wordCountLimit,
        starterGuide: currentSection.starterGuide,
        currentContent: content,
        prompt: aiPrompt,
        grantTitle: currentProposal?.grantTitle,
        grantAgency: currentProposal?.grantAgency,
        fundingAmount: currentProposal?.fundingAmount,
        deadline: currentProposal?.deadline,
      })
      if (res.data.success) {
        setAiResult(res.data.text)
      }
    } catch (err) {
      console.error('AI assist failed:', err)
      setAiResult('⚠️ AI Assistant encountered an error. Please try again.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleInsertAi = (mode) => {
    if (!aiResult) return
    if (!isAssignedToUser(currentSection)) {
      alert('You can only edit sections assigned to you.')
      return
    }
    if (mode === 'replace') {
      setContent(aiResult)
    } else {
      setContent((prev) => (prev ? prev + '\n\n' + aiResult : aiResult))
    }
    setAiResult('')
  }

  // ─── Add Team Comment (Unified Proposal Chat) ───
  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() || !selectedProposalId) return
    try {
      setCommentSubmitting(true)
      const res = await api.post(
        `/proposals/${selectedProposalId}/comments`,
        { text: newComment }
      )
      if (res.data.success && res.data.comments) {
        setProposals((prev) =>
          prev.map((p) => {
            if (p._id === selectedProposalId) {
              return {
                ...p,
                comments: res.data.comments,
              }
            }
            return p
          })
        )
        setNewComment('')
      }
    } catch (err) {
      console.error('Failed to post team comment:', err)
    } finally {
      setCommentSubmitting(false)
    }
  }

  // Status badge colors
  const statusColor = (status) => {
    if (status === 'Ready for Review') return 'bg-green-50 text-green-700 border-green-200'
    if (status === 'Approved') return 'bg-blue-50 text-blue-700 border-blue-200'
    if (status === 'In Progress') return 'bg-amber-50 text-amber-700 border-amber-200'
    return 'bg-warm-gray-50 text-warm-gray-600 border-warm-gray-200'
  }

  // ─── Loading State ───
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-warm-gray-500">Loading proposal workspace...</p>
        </div>
      </div>
    )
  }

  // ─── Empty State ───
  if (proposals.length === 0) {
    return (
      <div className="text-center py-16">
        <span className="text-5xl block mb-4">📄</span>
        <h3 className="font-heading text-xl font-bold text-warm-gray-900 mb-2">No Proposal Sections Assigned</h3>
        <p className="text-warm-gray-500 text-sm max-w-md mx-auto">
          Your Organization Admin hasn't assigned any proposal sections to you yet. Check back soon!
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ─── Proposal Switcher Tabs (For switching between active proposals) ─── */}
      {proposals.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-warm-gray-200/60">
          <span className="text-xs font-bold text-warm-gray-400 uppercase tracking-wider whitespace-nowrap mr-1">
            Active Proposals ({proposals.length}):
          </span>
          {proposals.map((prop) => {
            const isSelected = prop._id === selectedProposalId
            return (
              <button
                key={prop._id}
                onClick={() => {
                  setSelectedProposalId(prop._id)
                  if (prop.sections && prop.sections.length > 0) {
                    setSelectedSectionId(prop.sections[0]._id)
                  }
                }}
                className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer border whitespace-nowrap flex items-center gap-2 ${
                  isSelected
                    ? 'bg-purple-600 text-white border-purple-600 shadow-soft'
                    : 'bg-white text-warm-gray-700 border-warm-gray-200 hover:bg-warm-gray-50'
                }`}
              >
                <span>📄</span>
                <span>{prop.title}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-purple-100 text-purple-700'
                }`}>
                  {prop.sections?.length || 0} sections
                </span>
              </button>
            )
          })}
        </div>
      )}

      {/* ─── Proposal Header ─── */}
      <div className="bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-soft p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${isPI ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-purple-50 text-purple-700 border-purple-200'}`}>
                {isPI ? '🎓 Principal Investigator (PI) Workspace' : 'Active Workspace'}
              </span>
              <span className="text-[10px] text-warm-gray-400">•</span>
              <span className="text-xs text-warm-gray-500 font-medium">{currentProposal?.grantAgency}</span>
              <span className="text-[10px] text-warm-gray-400">•</span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </span>
            </div>
            <h2 className="font-heading text-2xl font-bold text-warm-gray-900">{currentProposal?.title}</h2>
            <p className="text-xs text-warm-gray-500 mt-1">
              Grant: <span className="font-semibold text-warm-gray-700">{currentProposal?.grantTitle}</span>
              {currentProposal?.deadline && <> &nbsp;•&nbsp; Deadline: <span className="font-semibold text-warm-gray-700">{currentProposal.deadline}</span></>}
              {currentProposal?.fundingAmount && <> &nbsp;•&nbsp; Amount: <span className="font-semibold text-primary">{currentProposal.fundingAmount}</span></>}
            </p>
          </div>

          {/* Action Buttons & Progress */}
          <div className="flex flex-wrap items-center gap-3">
            {/* View Mode Switcher for PI */}
            {isPI && (
              <div className="flex items-center bg-warm-gray-100/80 p-1 rounded-[12px] border border-warm-gray-200">
                <button
                  type="button"
                  onClick={() => setWorkspaceView('review')}
                  className={`px-3 py-2 rounded-[9px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    workspaceView === 'review'
                      ? 'bg-purple-600 text-white shadow-soft'
                      : 'text-warm-gray-600 hover:text-warm-gray-900'
                  }`}
                >
                  <span>📋</span> Section Review ({currentProposal?.sections?.length || 17})
                </button>
                <button
                  type="button"
                  onClick={() => setWorkspaceView('editor')}
                  className={`px-3 py-2 rounded-[9px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    workspaceView === 'editor'
                      ? 'bg-purple-600 text-white shadow-soft'
                      : 'text-warm-gray-600 hover:text-warm-gray-900'
                  }`}
                >
                  <span>✍️</span> Editor Workspace
                </button>
              </div>
            )}

            {/* ONLY PI CAN EXPORT FINAL PDF */}
            {isPI && (
              <button
                type="button"
                onClick={() => handleExportPDF(currentProposal)}
                className="px-4 py-2.5 rounded-[12px] bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-soft transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
              >
                <span>📥</span> Export PDF
              </button>
            )}

            {/* PROPOSAL STATUS & PI ACTIONS */}
            {currentProposal?.status === 'Awarded' ? (
              <span className="px-4 py-2.5 rounded-[12px] bg-gradient-to-r from-emerald-100 to-amber-100 text-emerald-900 border border-emerald-300 font-bold text-xs flex items-center gap-1.5 shadow-soft">
                <span>🏆</span> Sanctioned & Awarded
              </span>
            ) : currentProposal?.status === 'Under Evaluation' ? (
              <span className="px-4 py-2.5 rounded-[12px] bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold text-xs flex items-center gap-1.5 shadow-soft">
                <span>🔍</span> Agency Evaluation
              </span>
            ) : currentProposal?.status === 'Revisions Requested' ? (
              <span className="px-4 py-2.5 rounded-[12px] bg-amber-50 text-amber-900 border border-amber-300 font-bold text-xs flex items-center gap-1.5 shadow-soft">
                <span>📝</span> Revisions Requested
              </span>
            ) : currentProposal?.status === 'Rejected' ? (
              <span className="px-4 py-2.5 rounded-[12px] bg-rose-50 text-rose-800 border border-rose-200 font-bold text-xs flex items-center gap-1.5 shadow-soft">
                <span>❌</span> Not Sanctioned
              </span>
            ) : currentProposal?.status === 'Submitted to Agency' ? (
              <span className="px-4 py-2.5 rounded-[12px] bg-blue-50 text-blue-800 border border-blue-200 font-bold text-xs flex items-center gap-1.5 shadow-soft">
                <span>🏛️</span> Submitted to Agency
              </span>
            ) : currentProposal?.status === 'Submitted to Admin' ? (
              <span className="px-4 py-2.5 rounded-[12px] bg-amber-50 text-amber-800 border border-amber-200 font-bold text-xs flex items-center gap-1.5 shadow-soft">
                <span>⏳</span> In Institutional Review
              </span>
            ) : isPI ? (
              <button
                type="button"
                onClick={handleSubmitToAdmin}
                disabled={submittingToAdmin}
                className="px-4 py-2.5 rounded-[12px] bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white font-bold text-xs shadow-soft transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap disabled:opacity-50"
              >
                <span>🚀</span> {submittingToAdmin ? 'Submitting...' : 'Submit to Admin'}
              </button>
            ) : null}

            {/* Progress */}
            <div className="flex items-center gap-4 bg-cream/70 p-2.5 rounded-[12px] border border-warm-gray-200/50 min-w-[180px]">
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1 font-semibold">
                  <span className="text-warm-gray-700">Progress</span>
                  <span className="text-purple-600">{currentProposal?.progress || 0}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-warm-gray-200/80 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-700"
                    style={{ width: `${currentProposal?.progress || 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-warm-gray-400 mt-1">
                  {currentProposal?.sections?.filter(s => s.status === 'Approved').length || 0} / {currentProposal?.sections?.length || 0} approved
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Lifecycle & Dossier Lock Banner ─── */}
      {(isProposalLocked || currentProposal?.status === 'Revisions Requested') && (
        <div className={`p-4 rounded-[16px] border flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in ${
          currentProposal?.status === 'Awarded'
            ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-amber-50 border-emerald-300 text-emerald-950'
            : currentProposal?.status === 'Under Evaluation'
            ? 'bg-indigo-50/90 border-indigo-200 text-indigo-950'
            : currentProposal?.status === 'Revisions Requested'
            ? 'bg-amber-50/90 border-amber-300 text-amber-950'
            : currentProposal?.status === 'Rejected'
            ? 'bg-rose-50/90 border-rose-200 text-rose-950'
            : currentProposal?.status === 'Submitted to Agency'
            ? 'bg-blue-50/90 border-blue-200 text-blue-950'
            : 'bg-amber-50/90 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-start sm:items-center gap-3">
            <span className="text-2xl shrink-0 mt-0.5 sm:mt-0">
              {currentProposal?.status === 'Awarded' ? '🏆' :
               currentProposal?.status === 'Under Evaluation' ? '🔍' :
               currentProposal?.status === 'Revisions Requested' ? '📝' :
               currentProposal?.status === 'Rejected' ? '❌' :
               currentProposal?.status === 'Submitted to Agency' ? '🏛️' : '🔒'}
            </span>
            <div>
              <p className="text-xs font-bold font-heading">
                {currentProposal?.status === 'Awarded'
                  ? `Grant Sanctioned & Awarded! Sanction Order #${currentProposal?.awardDetails?.sanctionOrderNumber || 'Verified'}`
                  : currentProposal?.status === 'Under Evaluation'
                  ? `Under Agency Peer Review & Technical Evaluation (Ref #${currentProposal?.agencySubmission?.agencySubmissionId || 'Official'})`
                  : currentProposal?.status === 'Revisions Requested'
                  ? 'Revisions Requested by Funding Agency / Org Admin — Dossier Unlocked for Revisions'
                  : currentProposal?.status === 'Rejected'
                  ? 'Grant Proposal Not Sanctioned / Rejected by Funding Agency'
                  : currentProposal?.status === 'Submitted to Agency'
                  ? `Officially Endorsed & Dispatched to Agency: Confirmation Ref #${currentProposal?.agencySubmission?.agencySubmissionId || 'N/A'}`
                  : 'Proposal Submitted to Organization Admin (Institutional Compliance & Clearance Phase)'}
              </p>
              <p className="text-[11px] opacity-80 mt-0.5 leading-relaxed">
                {currentProposal?.status === 'Awarded'
                  ? `Sanctioned Amount: ₹${Number(currentProposal?.awardDetails?.sanctionedAmount || 0).toLocaleString()} | Tenure: ${currentProposal?.awardDetails?.durationMonths || 36} months. Congratulations to the project team!`
                  : currentProposal?.status === 'Under Evaluation'
                  ? 'The proposal dossier is under active assessment by the funding agency committee. Track updates in the Proposal Tracking Dashboard.'
                  : currentProposal?.status === 'Revisions Requested'
                  ? 'Please review the requested changes in team comments/chat, update the relevant sections, and resubmit when ready.'
                  : currentProposal?.status === 'Rejected'
                  ? 'The funding agency did not approve funding for this call cycle. Review reviewer notes in comments for feedback.'
                  : currentProposal?.status === 'Submitted to Agency'
                  ? `Submitted by ${currentProposal?.agencySubmission?.submittedByName || 'Admin'} on ${currentProposal?.agencySubmission?.submittedAt ? new Date(currentProposal.agencySubmission.submittedAt).toLocaleDateString() : 'N/A'}. Dossier is locked as an official record.`
                  : 'The proposal is locked while the Org Admin verifies mandatory institutional compliance prerequisites before legal dispatch.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <span className="px-2.5 py-1 rounded-[8px] bg-white/80 border border-current font-mono text-[10px] font-bold">
              {currentProposal?.status}
            </span>
            <button
              type="button"
              onClick={() => setShowFullProposalModal(true)}
              className="px-3 py-1.5 rounded-[8px] bg-white hover:bg-white/90 text-xs font-bold text-warm-gray-800 border border-warm-gray-300 shadow-xs cursor-pointer flex items-center gap-1"
            >
              <span>📄</span> View Master Dossier
            </button>
          </div>
        </div>
      )}

      {/* ─── PI Section-by-Section Review Table View ─── */}
      {isPI && workspaceView === 'review' && (
        <div className="bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-soft overflow-hidden animate-fade-in">
          <div className="px-6 py-4 border-b border-warm-gray-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-cream/40">
            <div>
              <h3 className="font-heading font-bold text-warm-gray-900 text-base">
                Proposal Sections Review ({currentProposal?.sections?.length || 17} Sections)
              </h3>
              <p className="text-xs text-warm-gray-500">
                Review each section submitted by your team members. Approve them section-by-section or approve all at once.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {!isProposalLocked && (
                <button
                  type="button"
                  onClick={handleApproveAllSections}
                  className="px-4 py-2 rounded-[10px] bg-green-600 hover:bg-green-700 text-white font-bold text-xs shadow-soft transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <span>✓</span> Approve All 17 Sections
                </button>
              )}
            </div>
          </div>

          <div className="divide-y divide-warm-gray-200/60 max-h-[700px] overflow-y-auto">
            {currentProposal?.sections?.map((sec) => {
              const secWordCount = sec.content?.trim() ? sec.content.trim().split(/\s+/).length : 0
              const commentCount = sec.comments?.length || 0
              return (
                <div
                  key={sec._id}
                  className="p-4 sm:p-5 hover:bg-cream/30 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="font-heading font-bold text-sm text-warm-gray-900">
                        {sec.title}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColor(sec.status)}`}>
                        {sec.status}
                      </span>
                      {commentCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded-full flex items-center gap-1">
                          💬 {commentCount} comments
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-warm-gray-500">
                      <span>
                        Assigned writer: <strong className="text-warm-gray-800">{sec.assignedToName || 'Unassigned'}</strong>
                      </span>
                      <span>•</span>
                      <span>
                        Words: <strong className="text-warm-gray-800">{secWordCount}</strong> / {sec.wordCountLimit || 500}
                      </span>
                      {sec.lastEditedAt && (
                        <>
                          <span>•</span>
                          <span>Last updated: {new Date(sec.lastEditedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Section Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setReviewSectionModal(sec)}
                      className={`px-3.5 py-2 rounded-[10px] text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                        !isProposalLocked && sec.status === 'Ready for Review'
                          ? 'bg-green-600 text-white border-green-600 hover:bg-green-700 shadow-soft animate-pulse'
                          : sec.status === 'Approved'
                          ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200'
                          : 'bg-warm-gray-100 hover:bg-warm-gray-200 text-warm-gray-800 border-warm-gray-300'
                      }`}
                    >
                      <span>👁️</span> {!isProposalLocked && sec.status === 'Ready for Review' ? 'Review & Approve' : sec.status === 'Approved' ? 'View Approved' : 'View Text'}
                    </button>
                    {!isProposalLocked && isAssignedToUser(sec) && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSectionId(sec._id)
                          setWorkspaceView('editor')
                        }}
                        className="px-3 py-2 rounded-[10px] text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>✍️</span> Edit
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ─── 3-Column Workspace ─── */}
      {(!isPI || workspaceView === 'editor') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ── Left: Section Selector (3 cols) ── */}
        <div className="lg:col-span-3 bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-soft overflow-hidden">
          <div className="p-4 border-b border-warm-gray-200/60 bg-cream/30 flex items-center justify-between">
            <p className="text-[10px] font-bold text-warm-gray-500 uppercase tracking-wider">
              My Assigned Sections ({myAssignedSections.length})
            </p>
            <span className="text-[10px] bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-bold">
              Assigned to Me
            </span>
          </div>
          <div className="p-3 space-y-1.5 max-h-[600px] overflow-y-auto">
            {myAssignedSections.length === 0 ? (
              <div className="p-6 text-center text-xs text-warm-gray-500">
                <p className="font-semibold mb-1">No writing sections assigned to you.</p>
                {isPI && (
                  <button
                    type="button"
                    onClick={() => setWorkspaceView('review')}
                    className="mt-2 text-purple-600 font-bold hover:underline cursor-pointer"
                  >
                    Go to Section Review →
                  </button>
                )}
              </div>
            ) : (
              myAssignedSections.map((sec) => {
                const isSelected = sec._id === selectedSectionId
                const commentCount = sec.comments?.length || 0
                return (
                  <div
                    key={sec._id}
                    onClick={() => {
                      setSelectedProposalId(currentProposal._id)
                      setSelectedSectionId(sec._id)
                    }}
                    className={`w-full text-left p-3 rounded-[12px] transition-all text-xs font-medium cursor-pointer border ${
                      isSelected
                        ? 'bg-purple-50 border-purple-200 text-purple-900 shadow-soft'
                        : 'bg-white hover:bg-warm-gray-50 text-warm-gray-700 border-warm-gray-200/60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="font-semibold leading-tight">{sec.title}</span>
                      {commentCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-100 text-amber-800 rounded-full flex-shrink-0 flex items-center gap-0.5">
                          💬 {commentCount}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-full border ${statusColor(sec.status)}`}>
                        {sec.status}
                      </span>
                      <span className="text-[9px] text-warm-gray-500 truncate max-w-[110px]">
                        👤 Assigned to Me
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── Center: Editor (6 cols) ── */}
        <div className="lg:col-span-6 bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-soft overflow-hidden flex flex-col">

          {/* Toolbar */}
          <div className="p-5 border-b border-warm-gray-200/60 flex flex-wrap items-center justify-between gap-3 bg-cream/30">
            <div className="min-w-0">
              <h3 className="font-heading font-bold text-warm-gray-900 text-base truncate">
                {currentSection?.title || 'Select a Section'}
              </h3>
              <p className="text-xs text-warm-gray-500">
                {wordCount} / {wordLimit} words &nbsp;•&nbsp; {charCount} chars
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {isProposalLocked ? (
                <span className="px-3 py-1.5 rounded-[10px] bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1">
                  🔒 Dossier Locked ({currentProposal?.status})
                </span>
              ) : (
                <>
                  {isPI && sectionStatus !== 'Approved' && (
                    <button
                      onClick={() => handleSaveSection('Approved')}
                      disabled={saving}
                      className="px-3 py-1.5 rounded-[10px] bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all cursor-pointer shadow-soft disabled:opacity-50"
                    >
                      ✓ Approve Section
                    </button>
                  )}
                  {isAssignedToUser(currentSection) ? (
                    <>
                      <button
                        onClick={handleToggleReview}
                        disabled={saving}
                        className={`px-3 py-1.5 rounded-[10px] text-xs font-bold transition-all cursor-pointer border ${
                          sectionStatus === 'Ready for Review'
                            ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                            : 'bg-warm-gray-100 hover:bg-warm-gray-200 text-warm-gray-800 border-warm-gray-300'
                        }`}
                      >
                        {sectionStatus === 'Ready for Review' ? '✓ Ready for Review' : '⬆ Mark Ready'}
                      </button>
                      <button
                        onClick={() => handleSaveSection(sectionStatus === 'Not Started' ? 'In Progress' : sectionStatus)}
                        disabled={saving}
                        className="px-4 py-1.5 rounded-[10px] bg-primary text-white text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer shadow-soft disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : '💾 Save'}
                      </button>
                    </>
                  ) : (
                    <span className="px-3 py-1.5 rounded-[10px] bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold flex items-center gap-1">
                      🔒 Read-Only (Assigned to {currentSection?.assignedToName || 'another member'})
                    </span>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Format Bar */}
          <div className="px-5 py-3 bg-warm-gray-50/90 border-b border-warm-gray-200/60 flex flex-wrap items-center gap-2 text-xs text-warm-gray-700">
            {/* View Mode Toggle Pill (Centered & Larger Height/Text) */}
            <div className="flex items-center bg-warm-gray-200/80 p-1 rounded-[10px] mr-2 shadow-inner">
              <button
                onClick={() => setEditorMode('edit')}
                className={`px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  editorMode === 'edit'
                    ? 'bg-white text-purple-900 shadow-soft'
                    : 'text-warm-gray-600 hover:text-warm-gray-900'
                }`}
              >
                <span>✏️</span> Edit
              </button>
              <button
                onClick={() => setEditorMode('preview')}
                className={`px-3.5 py-1.5 rounded-[8px] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  editorMode === 'preview'
                    ? 'bg-white text-purple-900 shadow-soft'
                    : 'text-warm-gray-600 hover:text-warm-gray-900'
                }`}
              >
                <span>👁️</span> Live Preview
              </button>
            </div>

            {/* Selection Formatting Buttons */}
            {editorMode === 'edit' && isAssignedToUser(currentSection) && !isProposalLocked && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={() => applyFormatting('**', '**', 'bold text')}
                  className="h-8 px-2.5 bg-white hover:bg-purple-50 border border-warm-gray-200 rounded-[8px] font-bold text-xs cursor-pointer text-warm-gray-800 shadow-xs hover:border-purple-300 transition-all"
                  title="Bold (Wraps selected text)"
                >
                  B
                </button>
                <button
                  onClick={() => applyFormatting('*', '*', 'italic text')}
                  className="h-8 px-2.5 bg-white hover:bg-purple-50 border border-warm-gray-200 rounded-[8px] italic font-semibold text-xs cursor-pointer text-warm-gray-800 shadow-xs hover:border-purple-300 transition-all"
                  title="Italic (Wraps selected text)"
                >
                  I
                </button>
                <button
                  onClick={() => applyFormatting('\n## ', '', 'Heading 2')}
                  className="h-8 px-2.5 bg-white hover:bg-purple-50 border border-warm-gray-200 rounded-[8px] font-bold text-xs cursor-pointer text-warm-gray-800 shadow-xs hover:border-purple-300 transition-all"
                  title="Heading 2"
                >
                  H2
                </button>
                <button
                  onClick={() => applyFormatting('\n### ', '', 'Heading 3')}
                  className="h-8 px-2.5 bg-white hover:bg-purple-50 border border-warm-gray-200 rounded-[8px] font-semibold text-xs cursor-pointer text-warm-gray-800 shadow-xs hover:border-purple-300 transition-all"
                  title="Heading 3"
                >
                  H3
                </button>
                <button
                  onClick={() => applyFormatting('\n- ', '', 'List item')}
                  className="h-8 px-2.5 bg-white hover:bg-purple-50 border border-warm-gray-200 rounded-[8px] font-medium text-xs cursor-pointer text-warm-gray-800 shadow-xs hover:border-purple-300 transition-all"
                  title="Bullet List"
                >
                  • List
                </button>
                <button
                  onClick={() => applyFormatting('\n1. ', '', 'Numbered item')}
                  className="h-8 px-2.5 bg-white hover:bg-purple-50 border border-warm-gray-200 rounded-[8px] font-medium text-xs cursor-pointer text-warm-gray-800 shadow-xs hover:border-purple-300 transition-all"
                  title="Numbered List"
                >
                  1. Num
                </button>
                <button
                  onClick={() => applyFormatting('\n> ', '', 'Quote text')}
                  className="h-8 px-2.5 bg-white hover:bg-purple-50 border border-warm-gray-200 rounded-[8px] font-medium text-xs cursor-pointer text-warm-gray-800 shadow-xs hover:border-purple-300 transition-all"
                  title="Quote"
                >
                  " Quote
                </button>
                <button
                  onClick={() => setShowTableModal(true)}
                  className="h-8 px-3 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-[8px] font-bold text-xs cursor-pointer text-purple-900 flex items-center gap-1.5 shadow-xs transition-all"
                  title="Interactive Table Builder"
                >
                  <span>⊞</span> Table Builder
                </button>
              </div>
            )}

            <div className="flex-1" />
            {lastSavedTime && <span className="text-[11px] text-warm-gray-400 font-medium italic">Saved at {lastSavedTime}</span>}
          </div>

          {/* Editor / Live Preview Container */}
          <div className="p-5 flex-1 min-h-[420px]">
            {editorMode === 'edit' ? (
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => {
                  if (isAssignedToUser(currentSection) && !isProposalLocked) {
                    setContent(e.target.value)
                  }
                }}
                readOnly={isProposalLocked || !isAssignedToUser(currentSection)}
                placeholder={
                  isProposalLocked
                    ? `Proposal dossier is locked (${currentProposal?.status}). Section content is in read-only mode.`
                    : !isAssignedToUser(currentSection)
                    ? 'This section is assigned to another team member. You can view and approve it, but only the assigned member can edit it.'
                    : `Start writing your "${currentSection?.title || 'section'}" here...\n\nSelect text and click B, I, H2, H3 to format highlighted text. Or click "📝 Draft Section" in the AI panel to auto-generate a draft.`
                }
                className={`w-full h-full min-h-[380px] p-4 rounded-[12px] border text-sm font-mono leading-relaxed resize-y transition-all ${
                  isProposalLocked || !isAssignedToUser(currentSection)
                    ? 'bg-warm-gray-50/80 text-warm-gray-800 border-warm-gray-200 cursor-not-allowed'
                    : 'bg-white border-warm-gray-200/70 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-warm-gray-900'
                }`}
              />
            ) : (
              <div className="w-full h-full min-h-[380px] max-h-[500px] overflow-y-auto p-5 rounded-[12px] bg-white border border-warm-gray-200/70 shadow-inner">
                {renderFormattedContent(content)}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-warm-gray-200/60 bg-cream/30 flex items-center justify-between text-xs">
            <span className="text-warm-gray-500">{wordCount} Words &nbsp;|&nbsp; {charCount} Characters</span>
            <span className={isOverLimit ? 'text-red-500 font-bold' : 'text-warm-gray-400'}>
              {isOverLimit ? `⚠️ Over limit by ${wordCount - wordLimit} words` : `${wordLimit - wordCount} words remaining`}
            </span>
          </div>
        </div>

        {/* ── Right: AI + Comments + Guide (3 cols) ── */}
        <div className="lg:col-span-3 bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-soft overflow-hidden">

          {/* Tab Header */}
          <div className="flex border-b border-warm-gray-200/60 bg-cream/40">
            {[
              { key: 'ai', label: '🤖 AI' },
              { key: 'comments', label: '💬 Team Chat', badge: currentProposal?.comments?.length, unread: unreadChatCount },
              { key: 'guide', label: '📋 Guide' },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveRightTab(tab.key)}
                className={`flex-1 py-3 text-xs font-bold transition-colors cursor-pointer border-b-2 flex items-center justify-center gap-1 ${
                  activeRightTab === tab.key
                    ? 'border-purple-600 text-purple-700 bg-white'
                    : 'border-transparent text-warm-gray-500 hover:text-warm-gray-800'
                }`}
              >
                <span>{tab.label}</span>
                {tab.unread > 0 && activeRightTab !== tab.key ? (
                  <span className="px-1.5 py-0.2 text-[9px] bg-red-500 text-white rounded-full font-bold animate-pulse">
                    +{tab.unread}
                  </span>
                ) : tab.badge > 0 ? (
                  <span className="px-1.5 py-0.2 text-[9px] bg-purple-100 text-purple-800 rounded-full font-bold">
                    {tab.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>

          {/* ── AI Tab ── */}
          {activeRightTab === 'ai' && (
            <div className="p-4 space-y-4 text-xs">
              <div className="p-3 rounded-[12px] bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-200/60">
                <p className="font-bold text-purple-900 mb-0.5 flex items-center gap-1.5">
                  <span>✨</span> GrantOS AI Research Assistant
                </p>
                <p className="text-[11px] text-purple-900 font-semibold leading-snug truncate">
                  Target: <span className="text-purple-700">{currentProposal?.grantTitle || 'Research Grant'}</span>
                </p>
                <p className="text-[10px] text-purple-600 mt-0.5">
                  Agency: {currentProposal?.grantAgency || 'Funding Agency'} &nbsp;•&nbsp; Section: "{currentSection?.title}"
                </p>
              </div>

              {/* AI Action Buttons */}
              <div className="space-y-1.5">
                {[
                  { action: 'generate', icon: '📝', label: 'Draft Section Text' },
                  { action: 'improve', icon: '🎨', label: 'Polish Academic Tone', needsContent: true },
                  { action: 'summarize', icon: '📊', label: 'Summarize Highlights', needsContent: true },
                  { action: 'compliance', icon: '✅', label: 'Check Compliance', needsContent: true },
                ].map((btn) => (
                  <button
                    key={btn.action}
                    onClick={() => handleAiAssist(btn.action)}
                    disabled={aiLoading || (btn.needsContent && !content)}
                    className="w-full text-left px-3 py-2.5 rounded-[10px] bg-white border border-warm-gray-200 hover:bg-purple-50 hover:border-purple-300 font-semibold text-warm-gray-800 transition-all cursor-pointer flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <span>{btn.icon} {btn.label}</span>
                    <span className="text-purple-500">→</span>
                  </button>
                ))}
              </div>

              {/* Custom Prompt */}
              <div className="space-y-1.5 pt-3 border-t border-warm-gray-200/60">
                <label className="font-semibold text-warm-gray-600 block">Custom Instructions (Optional):</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., Focus on machine learning methodology..."
                  className="w-full p-2.5 rounded-[10px] border border-warm-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20 resize-none"
                  rows={2}
                />
              </div>

              {/* Loading */}
              {aiLoading && (
                <div className="p-4 rounded-[12px] bg-purple-50 flex items-center justify-center gap-2 text-purple-700">
                  <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                  <span className="font-semibold">Generating...</span>
                </div>
              )}

              {/* AI Result */}
              {aiResult && (
                <div className="space-y-2 p-3 bg-purple-50/50 border border-purple-200 rounded-[12px]">
                  <p className="font-bold text-purple-900 text-[11px]">AI Generated Output:</p>
                  <div className="max-h-[200px] overflow-y-auto text-[11px] text-warm-gray-700 bg-white p-3 rounded-[8px] border border-warm-gray-200 font-mono leading-relaxed whitespace-pre-wrap">
                    {aiResult}
                  </div>
                  {isAssignedToUser(currentSection) ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleInsertAi('append')}
                        className="flex-1 py-1.5 bg-purple-600 text-white rounded-[8px] font-bold text-[11px] hover:bg-purple-700 transition-colors cursor-pointer"
                      >
                        + Append to Editor
                      </button>
                      <button
                        onClick={() => handleInsertAi('replace')}
                        className="py-1.5 px-3 bg-warm-gray-200 text-warm-gray-800 rounded-[8px] font-bold text-[11px] hover:bg-warm-gray-300 transition-colors cursor-pointer"
                      >
                        Replace All
                      </button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-[8px] border border-amber-200 italic text-center">
                      🔒 Read-only section. Only the assigned writer ({currentSection?.assignedToName}) can insert text.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ── Unified Team Chat Tab ── */}
          {activeRightTab === 'comments' && (
            <div className="p-4 flex flex-col h-[500px] text-xs">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-warm-gray-200/50">
                <span className="font-bold text-warm-gray-700 text-[11px]">💬 Proposal Discussion</span>
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Instant Live Sync
                </span>
              </div>
              <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-3 pr-1 mb-3">
                {(!currentProposal?.comments || currentProposal.comments.length === 0) ? (
                  <div className="text-center text-warm-gray-400 py-12">
                    <span className="text-3xl block mb-2">💬</span>
                    <p className="font-semibold">No team messages yet</p>
                    <p className="text-[10px] mt-1">Start a discussion with all team members working on this proposal.</p>
                  </div>
                ) : (
                  currentProposal.comments.map((c, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-[12px] border ${
                        c.senderRole === 'org_admin'
                          ? 'bg-amber-50/70 border-amber-200'
                          : 'bg-white border-warm-gray-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-warm-gray-900">{c.senderName}</span>
                          <span className={`px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                            c.senderRole === 'org_admin' ? 'bg-amber-200 text-amber-900' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {c.senderRole === 'org_admin' ? 'Admin' : 'Team'}
                          </span>
                        </div>
                        <span className="text-[9px] text-warm-gray-400">
                          {new Date(c.createdAt).toLocaleDateString()} {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] leading-relaxed text-warm-gray-700">{c.text}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input */}
              <form onSubmit={handleAddComment} className="pt-3 border-t border-warm-gray-200/60 flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Message team members..."
                  className="flex-1 px-3 py-2 rounded-[10px] border border-warm-gray-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
                <button
                  type="submit"
                  disabled={commentSubmitting || !newComment.trim()}
                  className="px-3.5 py-2 bg-primary text-white rounded-[10px] font-bold text-xs hover:bg-primary/90 transition-colors disabled:opacity-40 cursor-pointer shadow-soft"
                >
                  Send
                </button>
              </form>
            </div>
          )}

          {/* ── Guide Tab ── */}
          {activeRightTab === 'guide' && (
            <div className="p-4 space-y-4 text-xs">
              <div className="p-3 rounded-[12px] bg-blue-50 border border-blue-200">
                <p className="font-bold text-blue-900 mb-0.5">📋 Section Writing Guide</p>
                <p className="text-[11px] text-blue-700/80 leading-snug">
                  Follow these guidelines from {currentProposal?.grantAgency || 'the funding agency'} for "{currentSection?.title}".
                </p>
              </div>

              <div className="bg-white p-4 rounded-[12px] border border-warm-gray-200 space-y-3">
                <div>
                  <p className="font-bold text-warm-gray-800 mb-1.5">Template Outline & Requirements:</p>
                  <div className="text-[11px] text-warm-gray-600 leading-relaxed whitespace-pre-line bg-cream/50 p-3 rounded-[8px] border border-warm-gray-200/60">
                    {currentSection?.starterGuide || '• No specific guidance available for this section.'}
                  </div>
                </div>

                <div className="pt-2 border-t border-warm-gray-200/60">
                  <p className="font-bold text-warm-gray-800 mb-1">Section Details:</p>
                  <div className="space-y-1 text-[11px] text-warm-gray-600">
                    <p>📏 Word Limit: <span className="font-semibold text-warm-gray-900">{currentSection?.wordCountLimit || 500} words</span></p>
                    <p>👤 Assigned to: <span className="font-semibold text-warm-gray-900">{currentSection?.assignedToName || userName}</span></p>
                    <p>📊 Status: <span className={`font-semibold ${sectionStatus === 'Ready for Review' ? 'text-green-700' : 'text-amber-700'}`}>{sectionStatus}</span></p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* ─── Interactive Table Builder Modal ─── */}
      {showTableModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setShowTableModal(false)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-2xl w-full max-w-3xl p-6 sm:p-8 animate-fade-in max-h-[90vh] flex flex-col z-10 my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-warm-gray-200/60 mb-4">
              <div>
                <h2 className="font-heading text-lg font-bold text-warm-gray-900 flex items-center gap-2">
                  <span>📊</span> Interactive Table Builder
                </h2>
                <p className="text-xs text-warm-gray-500 mt-0.5">Visually edit rows and columns before inserting into your proposal.</p>
              </div>
              <button
                onClick={() => setShowTableModal(false)}
                className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Toolbar controls */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <button
                onClick={handleAddTableRow}
                className="px-3 py-1.5 rounded-[10px] bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <span>+</span> Add Row
              </button>
              <button
                onClick={handleAddTableColumn}
                className="px-3 py-1.5 rounded-[10px] bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <span>+</span> Add Column
              </button>
            </div>

            {/* Structured Table Grid Inputs */}
            <div className="overflow-x-auto overflow-y-auto flex-1 border border-warm-gray-200 rounded-[12px] p-2 bg-cream/30 mb-6">
              <table className="min-w-full border-collapse text-xs">
                <thead>
                  <tr className="bg-purple-100/70">
                    {tableData.headers.map((h, colIdx) => (
                      <th key={colIdx} className="p-2 border border-warm-gray-200 min-w-[140px]">
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={h}
                            onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                            placeholder={`Header ${colIdx + 1}`}
                            className="w-full px-2 py-1 bg-white border border-purple-200 rounded font-bold text-purple-950 focus:outline-none focus:ring-1 focus:ring-purple-500 text-xs"
                          />
                          {tableData.headers.length > 1 && (
                            <button
                              onClick={() => handleRemoveTableColumn(colIdx)}
                              className="text-red-400 hover:text-red-600 px-1 font-bold cursor-pointer"
                              title="Delete Column"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                    <th className="w-10 p-2 border border-warm-gray-200 bg-purple-50" />
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.map((row, rowIdx) => (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-warm-gray-50/50'}>
                      {row.map((cell, colIdx) => (
                        <td key={colIdx} className="p-1.5 border border-warm-gray-200">
                          <input
                            type="text"
                            value={cell}
                            onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value)}
                            placeholder="Cell text..."
                            className="w-full px-2 py-1 bg-transparent border border-transparent hover:border-warm-gray-200 focus:bg-white focus:border-purple-300 rounded text-warm-gray-800 focus:outline-none text-xs"
                          />
                        </td>
                      ))}
                      <td className="p-1 text-center border border-warm-gray-200">
                        {tableData.rows.length > 1 && (
                          <button
                            onClick={() => handleRemoveTableRow(rowIdx)}
                            className="text-red-400 hover:text-red-600 font-bold cursor-pointer px-1 text-xs"
                            title="Delete Row"
                          >
                            ✕
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-warm-gray-200/60">
              <button
                type="button"
                onClick={() => setShowTableModal(false)}
                className="px-4 py-2 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsertStructuredTable}
                className="px-5 py-2 rounded-[10px] font-bold text-white bg-primary hover:bg-primary-dark shadow-soft transition-all text-xs cursor-pointer"
              >
                ✓ Insert Table into Section
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* ─── Full Compiled Proposal Modal ─── */}
      {showFullProposalModal && currentProposal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setShowFullProposalModal(false)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-2xl w-full max-w-4xl p-6 sm:p-8 animate-fade-in max-h-[90vh] flex flex-col z-10 my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-warm-gray-200/60 mb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300">
                  {isProposalLocked ? `Official Dossier (${currentProposal.status})` : 'PI Master Compiled Document'}
                </span>
                <h2 className="font-heading text-xl font-bold text-warm-gray-900 mt-1">{currentProposal.title}</h2>
                <p className="text-xs text-warm-gray-500">Agency: {currentProposal.grantAgency || 'Funding Agency'} &nbsp;•&nbsp; Overall Progress: {currentProposal.progress || 0}%</p>
              </div>
              <button onClick={() => setShowFullProposalModal(false)} className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer">
                ✕
              </button>
            </div>

            {/* Agency Submission Banner if Submitted */}
            {currentProposal.agencySubmission?.agencySubmissionId && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-[12px] text-xs text-blue-900 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-xs">
                <span>🏛️ <strong>Official Agency Reference ID:</strong> <span className="font-mono font-bold text-blue-800">{currentProposal.agencySubmission.agencySubmissionId}</span></span>
                <span className="text-[11px] text-blue-700">Dispatched by {currentProposal.agencySubmission.submittedByName || 'Admin'} on {new Date(currentProposal.agencySubmission.submittedAt).toLocaleDateString()}</span>
              </div>
            )}

            {/* Compiled Sections Review Content */}
            <div className="flex-1 overflow-y-auto p-6 bg-white rounded-[16px] border border-warm-gray-200 shadow-inner space-y-6 mb-6 text-xs leading-relaxed text-warm-gray-800">
              {currentProposal.sections?.map((sec) => (
                <div key={sec._id} className="pb-6 border-b border-warm-gray-200/60 last:border-0">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-heading font-bold text-sm text-purple-950">{sec.title}</h3>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${statusColor(sec.status)}`}>
                        {sec.status} &nbsp;•&nbsp; Writer: {sec.assignedToName || 'Unassigned'}
                      </span>
                      {isPI && !isProposalLocked && sec.status !== 'Approved' && (
                        <button
                          type="button"
                          onClick={() => handleApproveSection(sec._id)}
                          disabled={approvingSectionId === sec._id}
                          className="px-2.5 py-1 rounded-[8px] bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] transition-all cursor-pointer shadow-soft flex items-center gap-1 disabled:opacity-50"
                        >
                          <span>✓</span> {approvingSectionId === sec._id ? 'Approving...' : 'Approve'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap font-sans bg-cream/30 p-4 rounded-[10px] border border-warm-gray-200/50">
                    {sec.content || <span className="text-warm-gray-400 italic">No section text submitted yet.</span>}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-3 border-t border-warm-gray-200/60">
              <button
                type="button"
                onClick={() => handleExportPDF(currentProposal)}
                className="px-5 py-2.5 rounded-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 shadow-soft transition-all text-xs cursor-pointer flex items-center gap-1.5"
              >
                <span>📥</span> Export PDF
              </button>
              {isPI && !isProposalLocked && (
                <button
                  type="button"
                  onClick={handleApproveAllSections}
                  className="px-4 py-2.5 rounded-[10px] font-bold text-white bg-green-600 hover:bg-green-700 shadow-soft transition-all text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <span>✓</span> Approve All 17 Sections
                </button>
              )}
              {isPI && !isProposalLocked && (
                <button
                  type="button"
                  onClick={handleSubmitToAdmin}
                  disabled={submittingToAdmin}
                  className="px-5 py-2.5 rounded-[10px] font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 shadow-soft transition-all text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <span>🚀</span> {submittingToAdmin ? 'Submitting...' : 'Submit Final Proposal to Admin'}
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowFullProposalModal(false)}
                className="px-4 py-2.5 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Single Section Review & Approve Modal (for PI) ─── */}
      {reviewSectionModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={() => setReviewSectionModal(null)} />
          <div className="relative bg-surface-elevated rounded-[20px] border border-warm-gray-200/60 shadow-2xl w-full max-w-2xl p-6 sm:p-8 animate-fade-in max-h-[90vh] flex flex-col z-10 my-auto">
            <div className="flex items-center justify-between pb-4 border-b border-warm-gray-200/60 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusColor(reviewSectionModal.status)}`}>
                    {reviewSectionModal.status}
                  </span>
                  <span className="text-xs text-warm-gray-400">•</span>
                  <span className="text-xs text-warm-gray-500 font-medium">
                    Word Limit: {reviewSectionModal.wordCountLimit || 500} words
                  </span>
                </div>
                <h2 className="font-heading text-lg font-bold text-warm-gray-900">{reviewSectionModal.title}</h2>
                <p className="text-xs text-warm-gray-500 mt-1">
                  Assigned writer: <span className="font-semibold text-warm-gray-800">{reviewSectionModal.assignedToName || 'Unassigned'}</span>
                </p>
              </div>
              <button
                onClick={() => setReviewSectionModal(null)}
                className="text-warm-gray-400 hover:text-warm-gray-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-white rounded-[12px] border border-warm-gray-200/80 font-mono text-xs text-warm-gray-800 leading-relaxed whitespace-pre-wrap mb-6">
              {reviewSectionModal.content ? (
                reviewSectionModal.content
              ) : (
                <span className="text-warm-gray-400 italic">No content written yet for this section.</span>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-warm-gray-200/60">
              <span className="text-xs text-warm-gray-500">
                Word count: <strong className="text-warm-gray-800">{reviewSectionModal.content?.trim() ? reviewSectionModal.content.trim().split(/\s+/).length : 0}</strong> words
              </span>
              <div className="flex items-center gap-2">
                {!isProposalLocked && isAssignedToUser(reviewSectionModal) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedSectionId(reviewSectionModal._id)
                      setReviewSectionModal(null)
                      setWorkspaceView('editor')
                    }}
                    className="px-3 py-2 rounded-[10px] font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 text-xs cursor-pointer flex items-center gap-1"
                  >
                    <span>✍️</span> Edit in Workspace
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setReviewSectionModal(null)}
                  className="px-4 py-2 rounded-[10px] font-semibold text-warm-gray-600 hover:bg-warm-gray-100 text-xs cursor-pointer"
                >
                  Close
                </button>
                {isPI && !isProposalLocked && reviewSectionModal.status !== 'Approved' && (
                  <button
                    type="button"
                    onClick={() => handleApproveSection(reviewSectionModal._id)}
                    disabled={approvingSectionId === reviewSectionModal._id}
                    className="px-5 py-2 rounded-[10px] font-bold text-white bg-green-600 hover:bg-green-700 shadow-soft transition-all text-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <span>✓</span> {approvingSectionId === reviewSectionModal._id ? 'Approving...' : 'Approve Section'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ─── Real-Time Live Notification Toast ─── */}
      {liveNotification && typeof document !== 'undefined' && createPortal(
        <div className="fixed bottom-6 right-6 z-[99999] bg-slate-900/95 text-white px-4 py-3 rounded-[14px] shadow-2xl border border-slate-700/80 text-xs flex items-center gap-3 backdrop-blur-md max-w-sm transition-all animate-fade-in">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
          <span className="flex-1 font-medium leading-snug">{liveNotification.message}</span>
          <button
            onClick={() => setLiveNotification(null)}
            className="text-slate-400 hover:text-white font-bold ml-1 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>,
        document.body
      )}
    </div>
  )
}