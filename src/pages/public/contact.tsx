import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PublicLayout } from '../../layouts/PublicLayout';
import { MailIcon, PhoneIcon, MapPinIcon } from 'lucide-react';
import api from '../../lib/api';

interface ContactInfo {
  title: string;
  icon: React.ReactNode;
  content: string;
}

export default function Contact() {
  const { t } = useTranslation('contact');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Usar a instância API configurada
      await api.post('/api/user/contact', {
        name: formData.name,
        email: formData.email,
        company: formData.company,
        phone: formData.phone,
        subject: formData.subject,
        message: formData.message,
      });
      
      // Sucesso no envio
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
        subject: '',
        message: '',
      });
    } catch (error) {
      setSubmitError(t('errorSubmitting'));
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const contactInfo: ContactInfo[] = [
    {
      title: t('email'),
      icon: <MailIcon className="h-6 w-6 text-blue-600" />,
      content: 'contato@interflow.chat'
    },
    {
      title: t('phone'),
      icon: <PhoneIcon className="h-6 w-6 text-blue-600" />,
      content: '+55 (19) 99600-3991'
    },
    {
      title: t('address'),
      icon: <MapPinIcon className="h-6 w-6 text-blue-600" />,
      content: 'Av. Marq. de São Vicente, 2219 - Conj. 812 Letra WE0097, Água Branca, São Paulo, SP'
    }
  ];

  return (
    <PublicLayout>
      <div className="pt-4 pb-8">
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl font-bold mb-4 text-gray-900 dark:text-white">
              {t('title')}
            </h1>
            <p className="text-xl text-gray-700 dark:text-gray-300 mb-12">
              {t('intro')}
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
              {/* Formulário de contato */}
              <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                  {t('formTitle')}
                </h2>

                {submitSuccess ? (
                  <div className="bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 px-4 py-3 rounded mb-4">
                    <p>{t('successMessage')}</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('form.name')} *
                        </label>
                        <input
                          type="text"
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('form.email')} *
                        </label>
                        <input
                          type="email"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('form.company')}
                        </label>
                        <input
                          type="text"
                          id="company"
                          name="company"
                          value={formData.company}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          {t('form.phone')}
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="mb-4">
                      <label htmlFor="subject" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('form.subject')} *
                      </label>
                      <select
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">{t('form.selectSubject')}</option>
                        <option value="sales">{t('form.subjects.sales')}</option>
                        <option value="support">{t('form.subjects.support')}</option>
                        <option value="partnership">{t('form.subjects.partnership')}</option>
                        <option value="other">{t('form.subjects.other')}</option>
                      </select>
                    </div>

                    <div className="mb-4">
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('form.message')} *
                      </label>
                      <textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        rows={5}
                        required
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      ></textarea>
                    </div>

                    {submitError && (
                      <div className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
                        <p>{submitError}</p>
                      </div>
                    )}

                    <div className="text-right">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? t('form.submitting') : t('form.submit')}
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Informações de contato */}
              <div className="lg:col-span-2">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
                  <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                    {t('contactInfo')}
                  </h2>
                  <div className="space-y-6">
                    {contactInfo.map((info, index) => (
                      <div key={index} className="flex items-start">
                        <div className="flex-shrink-0 mr-3">
                          {info.icon}
                        </div>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {info.title}
                          </h3>
                          <p className="mt-1 text-gray-600 dark:text-gray-400">
                            {info.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
                  <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                    {t('businessHours')}
                  </h2>
                  <div className="space-y-2">
                    <p className="text-gray-600 dark:text-gray-400">{t('workdays')}</p>
                    <p className="text-gray-600 dark:text-gray-400">{t('saturday')}</p>
                    <p className="text-gray-600 dark:text-gray-400">{t('sunday')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </PublicLayout>
  );
} 