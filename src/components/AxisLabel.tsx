import React from "react";

const style = {
  display: 'inline-block',
  width: '100%',
  'text-align': 'center',
  color: "#808080",
  'white-space': 'nowrap',
};

const rotateStyles = {
  transform: "rotate(-90deg)",
  width: 35,
  transformOrigin: "center",
  marginTop: 50,
  marginRight: -5

}

type LabelProps = {
    text: String;
    rotate?: boolean;
}

const Label = ({text, rotate} : LabelProps)  => (
  <div>
    <span style={{...style, ...(rotate ? rotateStyles : {})}}>{text}</span>
  </div>
);

export default Label;