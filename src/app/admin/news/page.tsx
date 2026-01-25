'use client'

export const dynamic = 'force-dynamic'

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useNewsAPI } from '@/hooks/useNewsAPI';
import Header from '@/components/Header';
import {
  NewsArticleWithDetails,
  NewsFilters,
  NewsSortOptions,
  NEWS_CATEGORIES,
  NEWS_STATUSES,
  NewsArticle
} from '@/types/news';
import {
  PlusCircle,
  Edit,
  Trash2,
  Eye,
  Search,
  Filter,
  Calendar,
  User,
  TrendingUp,
  FileText,
  MoreVertical,
  ExternalLink,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';

export default function NewsAdminPage() {
  const { user, profile } = useAuth();
  const { fetchNews, updateNews, deleteNews, loading: apiLoading, error: apiError } = useNewsAPI();
  const [news, setNews] = useState<NewsArticleWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  // Filters and sorting
  const [filters, setFilters] = useState<NewsFilters>({
    status: undefined, // Show all statuses by default in admin
  });
  const [sortOptions, setSortOptions] = useState<NewsSortOptions>({
    field: 'updated_at',
    direction: 'desc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNews, setSelectedNews] = useState<string[]>([]);

  // Check admin permissions
  const canManageNews = profile && ['admin', 'moderator', 'editor', 'guide', 'expert'].includes(profile.role);

  // Fetch news data using client method
  const fetchNewsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Prepare filters for client method
      const clientFilters: NewsFilters = {
        ...filters,
        search: searchQuery.trim() || undefined,
      };

      const result = await fetchNews(
        clientFilters,
        sortOptions,
        currentPage,
        20 // limit
      );

      setNews(result.data || []);
      setTotalCount(result.total || 0);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  // Handle status change using client method
  const handleStatusChange = async (newsId: string, newStatus: string) => {
    try {
      await updateNews(newsId, { status: newStatus as any });
      // Refresh the list
      fetchNewsData();
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Error changing status');
    }
  };

  // Handle delete using client method
  const handleDelete = async (newsId: string) => {
    if (!confirm('Are you sure you want to delete this news?')) {
      return;
    }

    try {
      await deleteNews(newsId);
      // Refresh the list
      fetchNewsData();
    } catch (err) {
      console.error('Error deleting news:', err);
      alert('Error deleting news');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'review': return 'bg-yellow-100 text-yellow-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published': return <CheckCircle className="w-3 h-3" />;
      case 'draft': return <FileText className="w-3 h-3" />;
      case 'review': return <Clock className="w-3 h-3" />;
      case 'archived': return <AlertCircle className="w-3 h-3" />;
      default: return <FileText className="w-3 h-3" />;
    }
  };

  useEffect(() => {
    if (canManageNews) {
      fetchNewsData();
    }
  }, [canManageNews, filters, sortOptions, currentPage, searchQuery]);

  // Redirect if no permissions
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Authorization Required</h1>
          <Link href="/auth" className="text-blue-600 hover:text-blue-800">
            Log in to system
          </Link>
        </div>
      </div>
    );
  }

  if (!canManageNews) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            You do not have permission to manage news
          </p>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header buildings={[]} />
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 py-8">

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">📰 News Management</h1>
                <p className="text-gray-600 mt-1">
                  Create, edit and moderate architectural news
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/admin/news/stats"
                  className="flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <TrendingUp className="w-5 h-5" />
                  Statistics
                </Link>

                <Link
                  href="/admin/news/create"
                  className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusCircle className="w-5 h-5" />
                  Create News
                </Link>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Total News</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCount}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Published</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {news.filter(n => n.status === 'published').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">In Moderation</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {news.filter(n => n.status === 'review').length}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center">
                <FileText className="w-8 h-8 text-gray-600" />
                <div className="ml-4">
                  <p className="text-sm text-gray-600">Drafts</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {news.filter(n => n.status === 'draft').length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row gap-4">

              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by title or content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Filter Toggle */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Filter className="w-5 h-5" />
                Filters
              </button>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                  {/* Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={filters.status || ''}
                      onChange={(e) => setFilters({ ...filters, status: e.target.value as any || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Statuses</option>
                      {NEWS_STATUSES.map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Category Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      value={filters.category || ''}
                      onChange={(e) => setFilters({ ...filters, category: e.target.value as any || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Categories</option>
                      {NEWS_CATEGORIES.map(category => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* City Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City
                    </label>
                    <input
                      type="text"
                      placeholder="City name"
                      value={filters.city || ''}
                      onChange={(e) => setFilters({ ...filters, city: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Featured Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={filters.featured === undefined ? '' : filters.featured.toString()}
                      onChange={(e) => setFilters({
                        ...filters,
                        featured: e.target.value === '' ? undefined : e.target.value === 'true'
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All News</option>
                      <option value="true">Featured News</option>
                      <option value="false">Regular News</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* News List */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Loading news...</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={fetchNewsData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : news.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">No news found</p>
                <Link
                  href="/admin/news/create"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <PlusCircle className="w-5 h-5" />
                  Create First News
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Title</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Category</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Author</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-900">Statistics</th>
                      <th className="text-right py-3 px-4 font-medium text-gray-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {news.map((article) => (
                      <tr key={article.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-start gap-3">
                            {article.featured_image_url && (
                              <img
                                src={article.featured_image_url}
                                alt=""
                                className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 line-clamp-2">
                                {article.title}
                              </h3>
                              {article.summary && (
                                <p className="text-sm text-gray-600 mt-1 line-clamp-1">
                                  {article.summary}
                                </p>
                              )}
                              {article.featured && (
                                <span className="inline-flex items-center gap-1 mt-1 text-xs bg-amber-100 text-amber-800 px-2 py-1 rounded">
                                  ⭐ Featured
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(article.status)}`}>
                            {getStatusIcon(article.status)}
                            {NEWS_STATUSES.find(s => s.value === article.status)?.label}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {NEWS_CATEGORIES.find(c => c.value === article.category)?.label}
                          </span>
                        </td>

                        <td className="py-4 px-4">
                          <div className="text-sm">
                            <p className="text-gray-900">
                              {article.author?.full_name || 'Unknown'}
                            </p>
                            {article.author?.role && (
                              <p className="text-gray-500 text-xs">
                                {article.author.role}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="text-sm">
                            <p className="text-gray-900">
                              {formatDate(article.updated_at)}
                            </p>
                            {article.published_at && article.status === 'published' && (
                              <p className="text-gray-500 text-xs">
                                Publ: {formatDate(article.published_at)}
                              </p>
                            )}
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="text-sm text-gray-600">
                            <div className="flex items-center gap-3">
                              <span className="flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                {article.views_count || 0}
                              </span>
                              <span className="flex items-center gap-1">
                                ❤️ {article.likes_count || 0}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center justify-end gap-2">

                            {/* View */}
                            <Link
                              href={`/news/${article.slug}`}
                              target="_blank"
                              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="View"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>

                            {/* Edit */}
                            <Link
                              href={`/admin/news/${article.id}/edit`}
                              className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Link>

                            {/* Status Actions */}
                            {article.status === 'draft' && (
                              <button
                                onClick={() => handleStatusChange(article.id, 'review')}
                                className="p-2 text-gray-600 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                                title="Send to moderation"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                            )}

                            {article.status === 'review' && (
                              <button
                                onClick={() => handleStatusChange(article.id, 'published')}
                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Publish"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            )}

                            {/* Delete (admin only) */}
                            {profile?.role === 'admin' && (
                              <button
                                onClick={() => handleDelete(article.id)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalCount > 20 && (
            <div className="mt-6 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Showing {((currentPage - 1) * 20) + 1}-{Math.min(currentPage * 20, totalCount)} of {totalCount}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Back
                </button>

                <span className="px-3 py-2 bg-blue-600 text-white rounded-lg">
                  {currentPage}
                </span>

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage * 20 >= totalCount}
                  className="px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
