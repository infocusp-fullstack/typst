"use client";
import { $typst } from "@myriaddreamin/typst-all-in-one.ts";
import { useEffect } from "react";
import React from "react";

function Test() {
  useEffect(() => {
    const foo = async () => {
      await $typst.svg({
        mainContent: "Hello, typst!",
      });
    };
    foo();
  }, []);
  return <div>Test</div>;
}

export default Test;
