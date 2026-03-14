// ============================================================================
// 🏙️ THE PENTHOUSE: MASTER TYPE REGISTRY
// Location: src/services/types.ts
// ============================================================================

/** 🛰️ RADAR: Initial Scraper Results */
export interface ScrapedItem {
  productId?: string | number;
  product_id?: string | number;
  item_id?: string | number;
  id?: string | number;
}

/** ⚙️ ENGINE: Raw AliExpress Product Data */
export interface AliProduct {
  aliexpress_ds_product_get_response?: {
    result?: {
      ae_item_base_info_dto?: { subject?: string };
      ae_item_sku_info_dtos?: { 
        ae_item_sku_info_d_t_o?: Array<{ 
          offer_sale_price?: string; 
          sku_price?: string; 
          sku_available_stock?: number 
        }> 
      };
      ae_multimedia_info_dto?: { image_urls?: string };
    };
  };
}

/** ⚙️ ENGINE: Raw AliExpress Freight Calculation */
export interface AliFreight {
  aliexpress_logistics_buyer_freight_calculate_response?: {
    result?: {
      aeop_freight_calculate_result_for_buyer_d_t_o_list?: {
        aeop_freight_calculate_result_for_buyer_dto?: Array<{
          freight?: { amount?: string | number };
          estimated_freight?: string | number;
        }>;
      };
    };
  };
}

/** 🚚 TRANSPORT: Cleaned Database Payload */
export interface SourcedProduct {
  product_id: string;
  title: string;
  price: number;
  stock: number;
  image_url: string;
  shipping_cost: string | number;
  status: string;
}

/** 🔑 AUTH: Local Token Storage Structure */
export interface AliTokenState {
  access_token: string;
  refresh_token: string;
  expire_time: number;
}

/** 🛡️ THE FIX: Official AliExpress Token Refresh API Response */
export interface AliExpressRefreshResponse {
  aliexpress_oauth_token_refresh_response?: {
    result?: {
      access_token: string;
      refresh_token: string;
      expire_in: string;
      resource_owner_id?: string;
    };
  };
}

/** ✍️ COPYWRITER: OpenAI Response Structure */
export interface AICopywriterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

/** 🔍 AUDITOR: Sentiment & Review Analysis */
export interface ReviewApiResponse {
  reviews: {
    text: string;
    rating?: number;
  }[];
}