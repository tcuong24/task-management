'use client';

import React from 'react';
import { Tooltip as AntTooltip, TooltipProps as AntTooltipProps } from 'antd';

export interface CustomTooltipProps extends AntTooltipProps {
  // Re-export all Ant Design Tooltip props for full compatibility
}

/**
 * CustomTooltip component wrapper around Ant Design Tooltip.
 * Allows centralized custom styling, animations, and theme overrides.
 */
export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  children,
  overlayInnerStyle,
  overlayClassName,
  color = '#292A2E', // Default sleek dark gray (gray-800) background
  ...props
}) => {
  return (
    <AntTooltip
      color={color}
      arrow={false}
      overlayInnerStyle={{
        fontSize: 11,
        fontWeight: 500,
        lineHeight: '14px',
        padding: '8px 8px',
        boxShadow: '0 4px 14px rgba(0, 0, 0, 0.12)',
        ...overlayInnerStyle,
      }}
      overlayClassName={`custom-app-tooltip ${overlayClassName || ''}`}
      {...props}
    >
      {children}
    </AntTooltip>
  );
};

export default CustomTooltip;
