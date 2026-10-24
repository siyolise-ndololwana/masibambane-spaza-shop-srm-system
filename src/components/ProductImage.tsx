import airtime from "@/assets/products/airtime.jpg";
import albanyBread from "@/assets/products/albany-bread.jpg";
import alwaysPads from "@/assets/products/always-pads.jpg";
import bakedBeans from "@/assets/products/baked-beans.jpg";
import cadburyChocolate from "@/assets/products/cadbury-chocolate.jpg";
import candles from "@/assets/products/candles.jpg";
import cocaCola from "@/assets/products/coca-cola.jpg";
import colgateToothpaste from "@/assets/products/colgate-toothpaste.jpg";
import eggs from "@/assets/products/eggs.jpg";
import fiveRosesTea from "@/assets/products/five-roses-tea.jpg";
import handyAndy from "@/assets/products/handy-andy.jpg";
import jikBleach from "@/assets/products/jik-bleach.jpg";
import knorrSoup from "@/assets/products/knorr-soup.jpg";
import lionMatches from "@/assets/products/lion-matches.jpg";
import maizeMeal from "@/assets/products/maize-meal.jpg";
import milk from "@/assets/products/milk.jpg";
import omo from "@/assets/products/omo.jpg";
import paraffin from "@/assets/products/paraffin.jpg";
import pilchards from "@/assets/products/pilchards.jpg";
import ramaMargarine from "@/assets/products/rama-margarine.jpg";
import ricoffy from "@/assets/products/ricoffy.jpg";
import simbaChips from "@/assets/products/simba-chips.jpg";
import spaghetti from "@/assets/products/spaghetti.jpg";
import sunflowerOil from "@/assets/products/sunflower-oil.jpg";
import sunlightDishwashing from "@/assets/products/sunlight-dishwashing.jpg";
import sunlightSoap from "@/assets/products/sunlight-soap.jpg";
import tasticRice from "@/assets/products/tastic-rice.jpg";
import toiletPaper from "@/assets/products/toilet-paper.jpg";
import vaseline from "@/assets/products/vaseline.jpg";
import whiteSugar from "@/assets/products/white-sugar.jpg";
import groceries from "@/assets/products/groceries.jpg";

const BY_NAME: Record<string, string> = {
  "airtime voucher r29": airtime,
  "albany sliced bread": albanyBread,
  "always pads 8s": alwaysPads,
  "cadbury dairy milk 80g": cadburyChocolate,
  "candles 6-pack": candles,
  "coca cola 1.5l": cocaCola,
  "colgate toothpaste 100ml": colgateToothpaste,
  "fatti's & moni's spaghetti 500g": spaghetti,
  "five roses tea 100 bags": fiveRosesTea,
  "full cream milk 1l": milk,
  "handy andy 750ml": handyAndy,
  "iwisa maize meal 2kg": maizeMeal,
  "jik bleach 750ml": jikBleach,
  "knorr soup 50g": knorrSoup,
  "koo baked beans 410g": bakedBeans,
  "large eggs 6-pack": eggs,
  "lion matches 10-pack": lionMatches,
  "lucky star pilchards 400g": pilchards,
  "omo washing powder 2kg": omo,
  "paraffin 1l": paraffin,
  "rama margarine 500g": ramaMargarine,
  "ricoffy 250g": ricoffy,
  "simba chips 120g": simbaChips,
  "sunflower oil 2l": sunflowerOil,
  "sunlight bar soap 175g": sunlightSoap,
  "sunlight dishwashing 750ml": sunlightDishwashing,
  "tastic rice 2kg": tasticRice,
  "twinsaver toilet paper 9-pack": toiletPaper,
  "vaseline petroleum jelly 250ml": vaseline,
  "white sugar 2.5kg": whiteSugar,
};

export function ProductImage({ name }: { name: string }) {
  const src = BY_NAME[name.toLowerCase()] ?? groceries;
  return <img src={src} alt={`${name} product illustration`} loading="lazy" width={512} height={512} className="aspect-square w-full object-contain bg-product-photo" />;
}
