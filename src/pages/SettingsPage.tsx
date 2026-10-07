import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import type { ObjectCard, AppSettings } from '../types/types'
import { ObjectLibrary } from '../components/ObjectLibrary'
import { ObjectForm } from '../components/ObjectForm'
import { SettingsPanel } from '../components/SettingsPanel'
import { ArrowLeft, BookOpen, Sliders, Plus } from 'lucide-react'

interface SettingsPageProps {
  objects: ObjectCard[]
  settings: AppSettings
  onAddObject: (data: Omit<ObjectCard, 'normalizedName' | 'normalizedAlternateNames'>) => Promise<any>
  onUpdateObject: (data: Omit<ObjectCard, 'normalizedName' | 'normalizedAlternateNames'>) => Promise<any>
  onDeleteObject: (id: string) => Promise<void>
  onUpdateSettings: (partial: Partial<AppSettings>) => Promise<void>
  onLoadStarterPack: () => Promise<any>
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  objects,
  settings,
  onAddObject,
  onUpdateObject,
  onDeleteObject,
  onUpdateSettings,
  onLoadStarterPack,
}) => {
  const [activeTab, setActiveTab] = useState<'library' | 'config'>('library')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingObject, setEditingObject] = useState<ObjectCard | null>(null)

  const handleOpenAdd = () => {
    setEditingObject(null)
    setIsFormOpen(true)
  }

  const handleEdit = (obj: ObjectCard) => {
    setEditingObject(obj)
    setIsFormOpen(true)
  }

  const handleFormSave = async (
    data: Omit<ObjectCard, 'normalizedName' | 'normalizedAlternateNames'>
  ) => {
    if (editingObject) {
      await onUpdateObject(data)
    } else {
      await onAddObject(data)
    }
    setIsFormOpen(false)
    setEditingObject(null)
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full pb-16">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 mb-6 sm:mb-8 pb-4 border-b border-rose-100">
        <div className="flex items-center gap-3 sm:gap-4">
          <Link
            to="/"
            title="Return to Home"
            aria-label="Back to home"
            className="p-2.5 sm:p-3 rounded-2xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border-2 border-rose-100 shadow-xs transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none m-0">
              Settings &amp; Library
            </h1>
            <p className="text-xs sm:text-sm font-bold text-slate-400 mt-1">
              Caregiver &amp; Parent Control Center
            </p>
          </div>
        </div>

        {activeTab === 'library' && !isFormOpen && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-rose-200 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Object</span>
          </button>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 p-1.5 bg-rose-100/50 rounded-2xl max-w-sm mb-6">
        <button
          type="button"
          onClick={() => {
            setActiveTab('library')
            setIsFormOpen(false)
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'library'
              ? 'bg-white text-rose-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Object Library ({objects.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('config')
            setIsFormOpen(false)
          }}
          className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'config'
              ? 'bg-white text-rose-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>App Preferences</span>
        </button>
      </div>

      {/* Main Tab Content */}
      {isFormOpen ? (
        <ObjectForm
          initialData={editingObject}
          onSave={handleFormSave}
          onCancel={() => {
            setIsFormOpen(false)
            setEditingObject(null)
          }}
        />
      ) : activeTab === 'library' ? (
        <ObjectLibrary
          objects={objects}
          onAddNew={handleOpenAdd}
          onEdit={handleEdit}
          onDelete={onDeleteObject}
          onLoadStarterPack={onLoadStarterPack}
        />
      ) : (
        <SettingsPanel settings={settings} onUpdate={onUpdateSettings} />
      )}
    </div>
  )
}
