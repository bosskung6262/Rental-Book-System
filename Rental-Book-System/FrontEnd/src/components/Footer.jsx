import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { Mail, Send, Book, Heart, Sparkles, Shield, FileText } from 'lucide-react';
import api from '../services/api';

const Footer = () => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      const response = await api.subscribeNewsletter(email);
      
      Swal.fire({
        icon: 'success',
        title: 'Subscribed Successfully! 🎉',
        html: `
          <p style="color: #666; line-height: 1.6;">
            Thank you for subscribing to ShelfShare updates!<br>
            <strong>A confirmation email has been sent to:</strong><br>
            <span style="color: #0770ad; font-weight: bold;">${email}</span>
          </p>
        `,
        confirmButtonColor: '#0770ad',
        confirmButtonText: 'Great!',
        timer: 5000
      });
      
      setEmail('');
    } catch (error) {
      console.error('Subscribe error:', error);
      
      Swal.fire({
        icon: 'error',
        title: 'Subscription Failed',
        text: error.response?.data?.message || 'Unable to subscribe. Please try again later.',
        confirmButtonColor: '#dc2626',
        confirmButtonText: 'OK'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const showPrivacyPolicy = () => {
    Swal.fire({
      title: '<div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 28px;">🔒</span><span>Privacy Policy</span></div>',
      html: `
        <div style="text-align: left; max-height: 400px; overflow-y: auto; padding: 10px;">
          <h3 style="color: #0770ad; font-weight: bold; margin-top: 15px;">📊 Information We Collect</h3>
          <p style="color: #666; line-height: 1.6;">
            We collect information you provide directly to us, including your name, email address, 
            and reading preferences when you create an account or use our services.
          </p>

          <h3 style="color: #0770ad; font-weight: bold; margin-top: 15px;">🛡️ How We Use Your Information</h3>
          <p style="color: #666; line-height: 1.6;">
            • Provide and maintain our library services<br>
            • Send you book recommendations and updates<br>
            • Improve user experience and personalization<br>
            • Analyze usage patterns and trends
          </p>

          <h3 style="color: #0770ad; font-weight: bold; margin-top: 15px;">🔐 Data Security</h3>
          <p style="color: #666; line-height: 1.6;">
            We implement industry-standard security measures to protect your personal information. 
            Your data is encrypted and stored securely on our servers.
          </p>

          <h3 style="color: #0770ad; font-weight: bold; margin-top: 15px;">🍪 Cookies</h3>
          <p style="color: #666; line-height: 1.6;">
            We use cookies to enhance your browsing experience and remember your preferences. 
            You can control cookie settings in your browser.
          </p>

          <h3 style="color: #0770ad; font-weight: bold; margin-top: 15px;">👥 Third-Party Sharing</h3>
          <p style="color: #666; line-height: 1.6;">
            We do not sell your personal information. We may share data with trusted service 
            providers who help us operate our platform, under strict confidentiality agreements.
          </p>

          <h3 style="color: #0770ad; font-weight: bold; margin-top: 15px;">✉️ Contact Us</h3>
          <p style="color: #666; line-height: 1.6;">
            For privacy concerns, email us at: <strong>privacy@shelfshare.com</strong>
          </p>

          <p style="color: #999; font-size: 12px; margin-top: 20px; font-style: italic;">
            Last updated: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      `,
      width: '600px',
      confirmButtonText: 'Got it',
      confirmButtonColor: '#0770ad',
      showCloseButton: true,
      customClass: {
        popup: 'rounded-2xl',
        title: 'text-xl font-bold',
        htmlContainer: 'text-sm'
      }
    });
  };

  const showTermsOfService = () => {
    Swal.fire({
      title: '<div style="display: flex; align-items: center; gap: 10px;"><span style="font-size: 28px;">📜</span><span>Terms of Service</span></div>',
      html: `
        <div style="text-align: left; max-height: 400px; overflow-y: auto; padding: 10px;">
          <h3 style="color: #0770ad; font-weight: bold; margin-top: 15px;">📖 Acceptance of Terms</h3>
          <p style="color: #666; line-height: 1.6;">
            By accessing and using ShelfShare, you accept and agree to be bound by these Terms of Service. 
            If you disagree with any part, please do not use our platform.
          </p>

          <h3 style="color: #0770ad; font-weight: bold; margin-top: 15px;">👤 User Accounts</h3>
          <p style="color: #666; line-height: 1.6;">
            • You must be at least 13 years old to create an account<br>
            • You are responsible for maintaining account security<br>
            • One account per person; no sharing credentials<br>
            • Provide accurate and complete information
          </p>

          <h3 style="color: #0770ad; font-weight: bold; margin-top: 15px;">📚 Borrowing Rules</h3>
          <p style="color: #666; line-height: 1.6;">
            • Maximum 5 books can be borrowed at once<br>
            • Standard loan period is 14 days<br>
            • Late returns may result in account restrictions<br>
            • Books must be returned in good condition
          </p>

          <h3 style="color: #0770ad; font-weight: bold; margin-top: 15px;">🚫 Prohibited Activities</h3>
          <p style="color: #666; line-height: 1.6;">
            You may not:<br>
            • Share your account with others<br>
            • Upload harmful or illegal content<br>
            • Attempt to breach our security systems<br>
            • Use the platform for commercial purposes without permission
          </p>

          <h3 style="color: #0770ad; font-weight: bold; margin-top: 15px;">📝 Content Rights</h3>
          <p style="color: #666; line-height: 1.6;">
            All books and content remain the property of their respective copyright holders. 
            Users may not reproduce, distribute, or commercially exploit borrowed materials.
          </p>

          <h3 style="color: #0770ad; font-weight: bold; margin-top: 15px;">⚖️ Liability</h3>
          <p style="color: #666; line-height: 1.6;">
            ShelfShare provides the platform "as is" without warranties. We are not liable for 
            lost data, service interruptions, or indirect damages arising from platform use.
          </p>

          <h3 style="color: #0770ad; font-weight: bold; margin-top: 15px;">🔄 Changes to Terms</h3>
          <p style="color: #666; line-height: 1.6;">
            We reserve the right to modify these terms at any time. Continued use after changes 
            constitutes acceptance of new terms.
          </p>

          <h3 style="color: #0770ad; font-weight: bold; margin-top: 15px;">📧 Contact</h3>
          <p style="color: #666; line-height: 1.6;">
            Questions? Email: <strong>legal@shelfshare.com</strong>
          </p>

          <p style="color: #999; font-size: 12px; margin-top: 20px; font-style: italic;">
            Effective date: ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      `,
      width: '600px',
      confirmButtonText: 'I Understand',
      confirmButtonColor: '#0770ad',
      showCloseButton: true,
      customClass: {
        popup: 'rounded-2xl',
        title: 'text-xl font-bold',
        htmlContainer: 'text-sm'
      }
    });
  };

  return (
    <footer className="bg-gradient-to-br from-[#0770ad] to-[#055a8c] text-white py-12 px-6 md:px-16 border-t border-blue-700/50">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">

        <div className="md:col-span-1">
          <div className="flex items-center gap-2 mb-4">
            <Book className="w-6 h-6" />
            <h3 className="text-xl font-black uppercase tracking-wider">ShelfShare</h3>
          </div>
          <p className="text-blue-100 text-sm leading-relaxed">
            Your personal library hub. Discover, borrow, and share knowledge across every genre.
          </p>
          <div className="flex items-center gap-3 mt-6">
            <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all hover:scale-110">
              <span className="text-lg">📘</span>
            </a>
            <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all hover:scale-110">
              <span className="text-lg">📚</span>
            </a>
            <a href="#" className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all hover:scale-110">
              <span className="text-lg">✨</span>
            </a>
          </div>
        </div>

        <div>
          <h4 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> Explore
          </h4>
          <ul className="space-y-2.5">
            <li>
              <Link to="/books" className="text-blue-100 hover:text-white hover:translate-x-1 inline-block transition-all text-sm">
                Browse Books
              </Link>
            </li>
            <li>
              <Link to="/books?sort=trending" className="text-blue-100 hover:text-white hover:translate-x-1 inline-block transition-all text-sm">
                Trending Now
              </Link>
            </li>
            <li>
              <Link to="/books?sort=rating" className="text-blue-100 hover:text-white hover:translate-x-1 inline-block transition-all text-sm">
                Top Rated
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Heart className="w-4 h-4" /> My Shelf
          </h4>
          <ul className="space-y-2.5">
            <li>
              <Link to="/favorites" className="text-blue-100 hover:text-white hover:translate-x-1 inline-block transition-all text-sm">
                Favorites
              </Link>
            </li>
            <li>
              <Link to="/borrow" className="text-blue-100 hover:text-white hover:translate-x-1 inline-block transition-all text-sm">
                Borrow & Return
              </Link>
            </li>
            <li>
              <Link to="/settings" className="text-blue-100 hover:text-white hover:translate-x-1 inline-block transition-all text-sm">
                Settings
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-bold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
            <Mail className="w-4 h-4" /> Stay Updated
          </h4>
          <p className="text-blue-100 text-xs mb-4 leading-relaxed">
            Subscribe to receive book recommendations and platform updates directly to your inbox!
          </p>
          <form onSubmit={handleSubscribe} className="flex flex-col gap-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300" />
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full bg-white/10 backdrop-blur-sm text-white placeholder-blue-200 pl-10 pr-4 py-2.5 rounded-xl outline-none border border-white/20 focus:border-white/50 focus:bg-white/15 transition-all text-sm disabled:opacity-50"
              />
            </div>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="bg-white text-[#0770ad] hover:bg-blue-50 font-bold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Subscribing...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Subscribe
                </>
              )}
            </button>
          </form>
        </div>

      </div>

      <div className="mt-10 pt-6 border-t border-white/20 flex flex-col md:flex-row items-center justify-between gap-4 text-blue-100 text-xs">
        <p className="flex items-center gap-2">
          <span>© {new Date().getFullYear()} ShelfShare</span>
          <span className="hidden md:inline">•</span>
          <span className="hidden md:inline">Built with ❤️ for book lovers</span>
        </p>
        
        <div className="flex items-center gap-6">
          <button 
            onClick={showPrivacyPolicy}
            className="hover:text-white transition-colors flex items-center gap-1.5 group"
          >
            <Shield className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            Privacy
          </button>
          <span className="text-white/30">•</span>
          <button 
            onClick={showTermsOfService}
            className="hover:text-white transition-colors flex items-center gap-1.5 group"
          >
            <FileText className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
            Terms
          </button>
          <span className="text-white/30">•</span>
          <button className="flex items-center gap-1.5 hover:text-white transition-colors">
            <span>🌐</span>
            <span>EN</span>
          </button>
        </div>
      </div>
    </footer>
  );
};

export default Footer;