import type { Product } from "@decocms/apps-commerce/types";
import { mapProductToAnalyticsItem } from "@decocms/apps-commerce/utils/productToAnalyticsItem";
import ProductSlider from "../../components/product/ProductSlider";
import Section, { Props as SectionHeaderProps } from "../../components/ui/Section";
import { useOffer } from "@decocms/apps-commerce/sdk/useOffer";
import { useSendEvent } from "../../sdk/useSendEvent";
import DeviceVisible, { type VisibilityConfig } from "../../components/ui/DeviceVisible";
import { type LoadingFallbackProps } from "~/types/deco";
export interface Props extends SectionHeaderProps, VisibilityConfig {
  products: Product[] | null;
  /**
   * @title Clear fixed header
   * @description Enable when this shelf is the first thing on the page (e.g. the homepage), so its title isn't hidden under the floating header, which is position:fixed and takes no space in normal flow.
   */
  clearFixedHeader?: boolean;
}
export default function ProductShelf({ products, title, cta, visibility, clearFixedHeader }: Props) {
  if (!products || products.length === 0) {
    return null;
  }
  const viewItemListEvent = useSendEvent({
    on: "view",
    event: {
      name: "view_item_list",
      params: {
        item_list_name: title,
        items: products.map((product, index) =>
          mapProductToAnalyticsItem({
            index,
            product,
            ...useOffer(product.offers),
          }),
        ),
      },
    },
  });
  return (
    <DeviceVisible visibility={visibility}>
      {clearFixedHeader && <div className="h-15" aria-hidden="true" />}
      <Section.Container {...viewItemListEvent}>
        <Section.Header title={title} cta={cta} />

        <ProductSlider products={products} itemListName={title} />
      </Section.Container>
    </DeviceVisible>
  );
}
export const LoadingFallback = ({ title, cta }: LoadingFallbackProps<Props>) => (
  <Section.Container>
    <Section.Header title={title} cta={cta} />
    <Section.Placeholder height="471px" />;
  </Section.Container>
);
