import { useParams } from 'react-router-dom'

export default function AdminProductEdit() {
  const { id } = useParams()

  return (
    <div>
      <h1 className="text-2xl font-bold text-brand-navy mb-6">Edit Product</h1>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <p className="text-gray-500">
          Editing product ID: <code className="bg-gray-100 px-2 py-0.5 rounded text-sm">{id}</code>
        </p>
        <p className="text-sm text-gray-400 mt-2 italic">
          Product edit form will be fully functional after Supabase is connected (Milestone C/D).
          The form structure will match the Add Product form with pre-filled values.
        </p>
      </div>
    </div>
  )
}

