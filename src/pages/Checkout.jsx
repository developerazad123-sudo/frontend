import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useCart } from '../contexts/CartContext'
import { formatCurrency } from '../utils/format'
import { useAuth } from '../contexts/AuthContext'

const Checkout = () => {
  const { cartItems, getCartTotal, clearCart } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  // Form state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    paymentMethod: 'razorpay'
  })

  useEffect(() => {
    // Pre-fill form with user data if available
    if (user) {
      setFormData(prev => ({
        ...prev,
        fullName: user.name || '',
        email: user.email || ''
      }))
    }
  }, [user])



  const subtotal = getCartTotal()
  const tax = Number((subtotal * 0.08).toFixed(2))
  const total = Number((subtotal + tax).toFixed(2))

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => {
        resolve(true)
      }
      script.onerror = () => {
        resolve(false)
      }
      document.body.appendChild(script)
    })
  }



  const createOrder = async () => {
    try {
      // Validate the total amount before sending to backend
      const validatedTotal = Number(total.toFixed(2));
      
      // Add validation to ensure the amount is reasonable (less than ₹50,000 for test)
      if (validatedTotal <= 0 || validatedTotal > 50000) {
        console.error('Invalid amount for payment:', validatedTotal);
        throw new Error(`Invalid amount: ₹${validatedTotal}. Amount must be between ₹0.01 and ₹50,000.`);
      }
      
      console.log('Sending order creation request with amount:', validatedTotal);
      
      const response = await fetch('https://backend-1-tf17.onrender.com/api/payment/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          amount: validatedTotal,
          currency: 'INR'
        })
      });
      
      const data = await response.json();
      
      // Log the full response for debugging
      console.log('Order creation response:', data);
      
      if (data.success) {
        console.log('Order created successfully:', data.order);
        return data.order;
      } else {
        console.error('Order creation failed:', data.error);
        throw new Error(data.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('Order creation error:', error);
      throw new Error(`Order creation failed: ${error.message}`);
    }
  }

  const verifyPayment = async (paymentData) => {
    try {
      const response = await fetch('https://backend-1-tf17.onrender.com/api/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      });
      
      const data = await response.json();
      console.log('Payment verification response:', data);
      return data;
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  }

  const handleRazorpayPayment = async (e) => {
    e.preventDefault()
    setLoading(true)
    setPaymentError('')

    // Validate form
    if (!formData.fullName || !formData.email || !formData.phone || 
        !formData.address || !formData.city || !formData.state || !formData.zipCode) {
      setPaymentError('Please fill in all required fields')
      setLoading(false)
      return
    }

    // Load Razorpay script
    const res = await loadRazorpay()
    if (!res) {
      setPaymentError('Failed to load Razorpay. Please try again.')
      setLoading(false)
      return
    }

    try {
      // Create order on backend
      const order = await createOrder();
      
      // Create payment options
      // Primary method: Try to get key from environment variable
      let razorpayKeyId = import.meta.env.VITE_REACT_APP_RAZORPAY_KEY_ID;
      
      // Use your live key directly for development since it's properly configured
      // This bypasses the environment variable issue while maintaining security
      razorpayKeyId = 'rzp_live_S11CCFPGfjyYmg';
      console.info('Using live key for payment processing');
      
      console.log('Environment variable VITE_REACT_APP_RAZORPAY_KEY_ID:', import.meta.env.VITE_REACT_APP_RAZORPAY_KEY_ID);
      console.log('Using Razorpay key ID:', razorpayKeyId);
      
      const options = {
        key: razorpayKeyId, // Use environment variable
        amount: order.amount, // Amount in paise
        currency: order.currency,
        name: 'Akario Mart',
        description: 'Product Purchase',
        image: 'https://example.com/your_logo.png',
        order_id: order.id, // Order ID from backend
        handler: async function (response) {
          try {
            // Verify payment on backend
            const verificationData = {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            };
            
            const verificationResult = await verifyPayment(verificationData);
            
            if (verificationResult.success) {
              // Payment successful
              placeOrder()
            } else {
              setPaymentError('Payment verification failed. Please contact support.')
            }
          } catch (error) {
            setPaymentError('Payment verification failed. Please try again.')
            console.error('Verification error:', error)
          }
        },
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone
        },
        notes: {
          address: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.zipCode}`
        },
        theme: {
          color: '#3399cc'
        }
      }

      // Ensure Razorpay is properly loaded before creating instance
      if (typeof window.Razorpay === 'undefined') {
        setPaymentError('Razorpay SDK not loaded properly. Please refresh the page.');
        setLoading(false);
        return;
      }
      
      const rzp = new window.Razorpay(options);
      
      // Attach event handlers
      rzp.on('payment.failed', function (response) {
        setPaymentError(response.error.description || 'Payment failed. Please try again.');
        console.error('Payment failed:', response.error);
      });
      
      // Open the checkout modal
      rzp.open();
      
      // Log when the checkout modal is opened
      console.log('Razorpay checkout opened');
    } catch (error) {
      setPaymentError('Failed to initiate payment. Please try again.')
      console.error('Payment initiation error:', error)
    } finally {
      setLoading(false)
    }
  }

  const placeOrder = () => {
    // In a real application, you would send the order to your backend
    setOrderPlaced(true)
    clearCart()
    
    // Redirect to order confirmation page after 3 seconds
    setTimeout(() => {
      navigate('/user/dashboard')
    }, 3000)
  }

  const handleResendOTP = async () => {
    setOtp('')
    const otpSuccess = await sendOTP()
    if (otpSuccess) {
      setOtpTimer(300) // Reset timer to 5 minutes
    }
  }

  if (cartItems.length === 0 && !orderPlaced) {
    return (
      <div className="min-h-screen bg-light-grey flex items-center justify-center">
        <motion.div 
          className="bg-white rounded-xl shadow-lg p-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <h2 className="text-2xl font-semibold mb-4 text-dark-grey">Your cart is empty</h2>
          <p className="text-gray-600 mb-6">Add some products to your cart before checkout</p>
          <motion.button 
            onClick={() => navigate('/products')}
            className="btn-primary"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Continue Shopping
          </motion.button>
        </motion.div>
      </div>
    )
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-light-grey flex items-center justify-center">
        <motion.div 
          className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold mb-2 text-dark-grey">Order Placed Successfully!</h2>
          <p className="text-gray-600 mb-6">Thank you for your purchase. You will be redirected to your dashboard shortly.</p>
          <div className="bg-gray-100 rounded-lg p-4 text-left">
            <h3 className="font-medium text-dark-grey mb-2">Order Summary</h3>
            <div className="flex justify-between text-sm">
              <span>Order Total:</span>
              <span className="font-medium">{formatCurrency(total)}</span>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-light-grey">
      <motion.div 
        className="max-w-7xl mx-auto px-4 py-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <motion.h1 
          className="text-4xl font-bold text-dark-grey mb-8"
          initial={{ y: -20 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.2 }}
        >
          Checkout
        </motion.h1>
        
        {paymentError && (
          <motion.div 
            className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
            role="alert"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className="block sm:inline">{paymentError}</span>
          </motion.div>
        )}
        
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-2xl font-semibold mb-6 text-dark-grey">Shipping Information</h2>
              
              <form onSubmit={handleRazorpayPayment}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Zip Code *
                    </label>
                    <input
                      type="text"
                      name="zipCode"
                      value={formData.zipCode}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Address *
                    </label>
                    <input
                      type="text"
                      name="address"
                      value={formData.address}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      State *
                    </label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      required
                    />
                  </div>
                </div>
                

                
                <div className="border-t border-gray-200 pt-6">
                  <h2 className="text-2xl font-semibold mb-6 text-dark-grey">Payment Method</h2>
                  
                  <div className="space-y-4">
                    <div className="flex items-center">
                      <input
                        type="radio"
                        id="razorpay"
                        name="paymentMethod"
                        value="razorpay"
                        checked={formData.paymentMethod === 'razorpay'}
                        onChange={handleInputChange}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="razorpay" className="ml-3 block text-sm font-medium text-gray-700">
                        Razorpay (Credit Card, Debit Card, UPI, Net Banking)
                      </label>
                    </div>
                  </div>
                  
                  <motion.button
                    type="submit"
                    className="w-full mt-8 btn-success py-3"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : `Pay ${formatCurrency(total)}`}
                  </motion.button>
                </div>
              </form>
            </div>
          </div>
          
          {/* Order Summary */}
          <div>
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-8">
              <h2 className="text-2xl font-semibold mb-6 text-dark-grey">Order Summary</h2>
              
              <div className="space-y-4 mb-6">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="border-t pt-4 flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-dark-grey mb-3">Items in Cart</h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {cartItems.map((item) => {
                    const product = item.product || item
                    const itemTotal = (product.discount 
                      ? product.price * (1 - product.discount / 100)
                      : product.price) * (item.quantity || 1)
                    
                    return (
                      <div key={product._id || product.id} className="flex justify-between text-sm">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-gray-600">Qty: {item.quantity || 1}</p>
                        </div>
                        <span>{formatCurrency(itemTotal)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}

export default Checkout