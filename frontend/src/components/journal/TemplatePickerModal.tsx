/**
 * TemplatePickerModal - Modal to select a template for new entries
 */

import type { JournalTemplate } from '../../types/journal';

interface TemplatePickerModalProps {
  isOpen: boolean;
  templates: JournalTemplate[];
  onClose: () => void;
  onSelectTemplate: (templateId: string) => void;
  onCreateBlank: () => void;
}

export default function TemplatePickerModal({
  isOpen,
  templates,
  onClose,
  onSelectTemplate,
  onCreateBlank,
}: TemplatePickerModalProps) {
  if (!isOpen) return null;

  const systemTemplates = templates.filter((t) => t.is_system);
  const customTemplates = templates.filter((t) => !t.is_system);

  const templateIcons: Record<string, string> = {
    'Pre-Trade Analysis': '🎯',
    'Post-Trade Review': '📊',
    'Weekly Review': '📅',
    'Lesson Learned': '💡',
    'Quick Mood Check': '🌡️',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '90%',
          maxWidth: '500px',
          maxHeight: '80vh',
          backgroundColor: '#251E17',
          border: '1px solid rgba(212, 165, 69, 0.2)',
          borderRadius: '16px',
          zIndex: 1001,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid rgba(212, 165, 69, 0.1)',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '18px', color: '#F5C76D', fontWeight: 700 }}>
            Create New Entry
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: '#8B7355',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '16px 20px', maxHeight: 'calc(80vh - 140px)', overflow: 'auto' }}>
          {/* Blank Entry Option */}
          <button
            onClick={onCreateBlank}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              width: '100%',
              padding: '14px 16px',
              marginBottom: '16px',
              backgroundColor: 'rgba(245, 199, 109, 0.1)',
              border: '1px solid rgba(245, 199, 109, 0.3)',
              borderRadius: '12px',
              color: '#F5C76D',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <span style={{ fontSize: '24px' }}>📝</span>
            <div>
              <div>Blank Entry</div>
              <div style={{ fontSize: '12px', color: '#8B7355', fontWeight: 400 }}>
                Start from scratch
              </div>
            </div>
          </button>

          {/* System Templates */}
          {systemTemplates.length > 0 && (
            <>
              <div
                style={{
                  fontSize: '12px',
                  color: '#8B7355',
                  fontWeight: 600,
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Templates
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
                {systemTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => onSelectTemplate(template.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: 'rgba(37, 30, 23, 0.6)',
                      border: '1px solid rgba(212, 165, 69, 0.15)',
                      borderRadius: '10px',
                      color: '#F7E7C6',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>
                      {templateIcons[template.name] || '📋'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{template.name}</div>
                      {template.description && (
                        <div style={{ fontSize: '12px', color: '#8B7355' }}>
                          {template.description}
                        </div>
                      )}
                    </div>
                    {template.usage_count > 0 && (
                      <span style={{ fontSize: '11px', color: '#6B5D4D' }}>
                        Used {template.usage_count}x
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Custom Templates */}
          {customTemplates.length > 0 && (
            <>
              <div
                style={{
                  fontSize: '12px',
                  color: '#8B7355',
                  fontWeight: 600,
                  marginBottom: '8px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                Your Templates
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {customTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => onSelectTemplate(template.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      width: '100%',
                      padding: '12px 14px',
                      backgroundColor: 'rgba(37, 30, 23, 0.6)',
                      border: '1px solid rgba(212, 165, 69, 0.15)',
                      borderRadius: '10px',
                      color: '#F7E7C6',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 150ms ease',
                    }}
                  >
                    <span style={{ fontSize: '20px' }}>📋</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500 }}>{template.name}</div>
                      {template.description && (
                        <div style={{ fontSize: '12px', color: '#8B7355' }}>
                          {template.description}
                        </div>
                      )}
                    </div>
                    {template.usage_count > 0 && (
                      <span style={{ fontSize: '11px', color: '#6B5D4D' }}>
                        Used {template.usage_count}x
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
