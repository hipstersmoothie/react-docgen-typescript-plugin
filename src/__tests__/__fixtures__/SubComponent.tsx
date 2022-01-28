import * as React from "react";

export default function Root(props: { name: string }) {
  return <span>root {props.name}</span>;
}

function Sub(props: { name: string }) {
  return <span>sub {props.name}</span>;
}

Root.Sub = Sub;
