import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId)

      if (!productInCart) {
        const { data } = await api.get(`products/${productId}`)
        const product = (data as Product)

        if (product) {
          const updatedCart = [...cart, { ...product, amount: 1 }]

          setCart(updatedCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
        } else {
          toast.error('Erro na adição do produto');
        }
      } else {
        const { data } = await api.get(`stock/${productId}`)
        const productStock = (data as Stock)

        if (productInCart?.amount < productStock?.amount) {
          const updatedCart = cart.map(product => product.id === productId
            ? { ...product, amount: product.amount + 1 }
            : product
          )

          setCart(updatedCart)
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
        } else if (productStock && (productInCart?.amount >= productStock?.amount)) {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const isProductInCart = cart.find(product => product.id === productId)

      if (isProductInCart) {
        const updatedCart = cart.filter(product => product.id !== productId)

        setCart(updatedCart)
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
      } else {
        toast.error('Erro na remoção do produto');
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) return

      const { data } = await api.get(`stock/${productId}`)
      const productStock = (data as Stock)

      if (amount > productStock?.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const updatedCart = cart.map(product => product.id === productId
        ? { ...product, amount: amount }
        : product
      )

      setCart(updatedCart)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
